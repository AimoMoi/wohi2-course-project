const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const path = require("path");

const multer = require("multer");

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
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function formatQuestion(question) {
  return {
    ...question,
    keywords: question.keywords.map((k) => k.name),
    userName: question.user?.name || null,
    likeCount: question._count?.likes ?? 0,
    liked: question.likes ? question.likes.length > 0 : false,
    user: undefined,
    likes: undefined,
    _count: undefined,
  };
}

function parseKeywords(keywords) {
  if (Array.isArray(keywords)) return keywords;
  if (typeof keywords === "string") {
    return keywords.split(",").map((k) => k.trim()).filter(Boolean);
  }
  return [];
}

router.use(authenticate);

router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;

  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { id: "asc" },
      skip,
      take: limit,
      include: {
        keywords: true,
        user: true,
        likes: {
          where: { userId: req.user.userId },
          take: 1,
        },
        _count: {
          select: { likes: true },
        },
      },
    }),
    prisma.question.count({ where }),
  ]);

  res.json({
    data: questions.map(formatQuestion),
    page,
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
      likes: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { likes: true } },
    }

  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(formatQuestion(question));
});

router.post("/", upload.single("image"), async (req, res) => {
  const { question, answer, keywords } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

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
    include: {
      keywords: true,
      user: true,
      likes: {
        where: { userId: req.user.userId },
        take: 1,
      },
      _count: {
        select: { likes: true },
      },
    }
  });
  res.status(201).json(formatQuestion(newQuestion));
});

router.put("/:qId", isOwner, upload.single("image"), async (req, res) => {
  const qId = Number(req.params.qId);
  const { question, answer, keywords } = req.body;

  const existingQuestion = await prisma.question.findUnique({ where: { id: qId } });

  if (!existingQuestion) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (!question || !answer) {
    return res.status(400).json({ msg: "question and answer are required" });
  }

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
    include: {
      keywords: true,
      user: true,
      likes: {
        where: { userId: req.user.userId },
        take: 1,
      },
      _count: {
        select: { likes: true },
      },
    }
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
      likes: {
        where: { userId: req.user.userId },
        take: 1,
      },
      _count: {
        select: { likes: true },
      },
    }
  });

  if (!question) {
    return res.status(404).json({
      message: "Question not found"
    });
  }

  await prisma.question.delete({
    where: { id: qId },
  });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(question)
  });
});

router.post("/:qId/like", async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({ where: { id: qId } });
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  const like = await prisma.like.upsert({
    where: { userId_questionId: { userId: req.user.userId, questionId: qId } },
    update: {},
    create: { userId: req.user.userId, questionId: qId },
  });

  const likeCount = await prisma.like.count({ where: { questionId: qId } });

  res.status(201).json({
    id: like.id,
    questionId: qId,
    liked: true,
    likeCount,
    createdAt: like.createdAt,
  });
});

router.delete("/:qId/like", async (req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({ where: { id: qId } });
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  await prisma.like.deleteMany({
    where: { userId: req.user.userId, questionId: qId },
  });

  const likeCount = await prisma.like.count({ where: { questionId: qId } });

  res.json({ questionId: qId, liked: false, likeCount });
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError ||
        err?.message === "Only image files are allowed") {
        return res.status(400).json({ msg: err.message });
    }
    next(err);
});



module.exports = router;