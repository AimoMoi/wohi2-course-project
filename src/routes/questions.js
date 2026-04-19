const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");

function formatQuestion(question) {
  return {
    id: question.id,
    question: question.question,
    answer: question.answer,
  };
}

router.get("/", async (req, res) => {
  const questions = await prisma.question.findMany()
  res.json(questions.map(formatQuestion));
});

router.get("/:qId", async(req, res) => {
  const qId = Number(req.params.qId);

  const question = await prisma.question.findUnique({
    where: { id: qId },
  });

  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }

  res.json(formatQuestion(question));
});

router.post("/", async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }
  const newQuestion = await prisma.question.create({
    data: {
      question,
      answer,
    },
  });
  res.status(201).json(formatQuestion(newQuestion));
});

router.put("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }

  const existingQuestion = await prisma.question.findUnique({
    where: { id: qId },
  });

  if (!existingQuestion) {
    return res.status(404).json({
      message: "Question not found"
    });
  }

  const updatedQuestion = await prisma.question.update({
    where: { id: qId },
    data: {
      question,
      answer,
    },
  });

  res.json(formatQuestion(updatedQuestion));
});

router.delete("/:qId", async (req, res) => {
  const qId = Number(req.params.qId);

  const existingQuestion = await prisma.question.findUnique({
    where: { id: qId },
  });

  if (!existingQuestion) {
    return res.status(404).json({
      message: "Question not found"
    });
  }

  const deletedQuestion = await prisma.question.delete({
    where: { id: qId },
  });

  res.json({
    message: "Question deleted successfully",
    question: formatQuestion(deletedQuestion)
  });
});

module.exports = router;