const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const path = require("path");
const multer = require("multer");
const { NotFoundError, ValidationError } = require("../lib/errors");
const { z } = require("zod");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new ValidationError("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const QuestionInput = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user?.name || null,
    solved: question.attempts ? question.attempts.length > 0 : false,
    user: undefined,
    attempts: undefined,
  };
}

router.use(authenticate);

router.get("/", async (req, res) => {
  const { keyword } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const where = keyword
    ? { keywords: { some: { name: keyword } } } : {};

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        keywords: true,
        user: true,
        attempts: { where: { userId: req.user.userId, correct: true,}, take: 1, },
        _count: { select: { attempts: true }, },
      },
      orderBy: { id: "asc" },
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    data: questions.map(formatQuestion), page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
});

router.get("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: {
        keywords: true,
        user: true,
        attempts: { where: { userId: req.user.userId, correct: true,}, take: 1, },
        _count: { select: { attempts: true }, },
      },

  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  res.json(formatQuestion(question));
});

router.post("/", upload.single("image"), async (req, res) => {
  const { question, answer, keywords } = QuestionInput.parse(req.body);

  const keywordsArray = parseKeywords(keywords);

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
      userId: req.user.userId,
      imageUrl,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true, _count: { select: { attempts: true } } },
  });
  res.status(201).json(formatQuestion(newQuestion));
});

router.put("/:qId", isOwner, upload.single("image"), async (req, res) => {
  const qId = Number(req.params.qId);

  const { question, answer, keywords } = QuestionInput.parse(req.body);

  const keywordsArray = parseKeywords(keywords);

  const data = {
    question,
    answer,
    keywords: {
      set: [],
      connectOrCreate: keywordsArray.map((kw) => ({
        where: { name: kw },
        create: { name: kw },
      })),
    },
  };

  if (req.file) { data.imageUrl = `/uploads/${req.file.filename}`; }

  const updatedQuestion = await prisma.question.update({
    where: { id: qId },
    data,
    include: { keywords: true, user: true, _count: { select: { attempts: true } } },
  });
  res.json(formatQuestion(updatedQuestion));
});

router.delete("/:qId", isOwner, async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({
    where: { id: qId },
    include: {
      keywords: true,
      user: true,
      attempts: { where: { userId: req.user.userId, correct: true, }, take: 1, }
    }
  });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  await prisma.attempt.deleteMany({ where: { questionId: qId } });
  await prisma.question.delete({ where: { id: qId }, });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(question)
  });
});

router.post("/:qId/play", async (req, res) => {
  const qId = Number(req.params.qId);
  const { answer } = req.body;

  if (!answer) {
    throw new ValidationError("Answer is required");
  }

  const question = await prisma.question.findUnique({ where: { id: qId } });

  if (!question) {
    throw new NotFoundError("Question not found");
  }

  const normalize = (value) => value.trim().toLowerCase();
  const correct = normalize(answer) === normalize(question.answer);

  const attempt = await prisma.attempt.create({
    data: {
      userId: req.user.userId,
      questionId: qId,
      answer,
      correct,
    }
  });

  res.status(201).json({
    id: attempt.id,
    correct: attempt.correct,
    submittedAnswer: attempt.answer,
    correctAnswer: question.answer,
    createdAt: attempt.createdAt,
  });
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError ||
    err?.message === "Only image files are allowed") {
   throw new ValidationError(err.message);
  }
  next(err);
});

module.exports = router;