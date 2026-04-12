const express = require("express");
const router = express.Router();

const questions = require("../data/questions");

router.get("/", (req, res) => {
  res.json(questions);
});

router.get("/:qId", (req, res) => {
  const qId = Number(req.params.qId);

  const question = questions.find((q) => q.id === qId);

  if (!question) {
    return res.status(404).json({ message: "Post not found" });
  }

  res.json(question);
});

router.post("/", (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      message: "question and answer are required"
    });
  }
  const maxId = Math.max(...questions.map(p => p.id), 0);

  const newQuestion = {
    id: questions.length ? maxId + 1 : 1,
    question, answer
  };
  questions.push(newQuestion);
  res.status(201).json(newQuestion);
});

router.put("/:qId", (req, res) => {
  const qId = Number(req.params.qId);
  const { question, answer } = req.body;

  const q = questions.find((q) => q.id === qId);

  if (!q) {
    return res.status(404).json({ message: "Question not found" });
  }

  if (!question || !answer) {
    return res.json({
      message: "question and answer are required"
    });
  }

  q.question = question
  q.answer = answer

  res.json(q);
});

router.delete("/:qId", (req, res) => {
  const qId = Number(req.params.qId);

  const qIndex = questions.findIndex((q) => q.id === qId);

  if (qIndex === -1) {
    return res.status(404).json({ message: "Question not found" });
  }

  const deletedQuestion = questions.splice(qIndex, 1);

  res.json({
    message: "Question deleted successfully",
    question: deletedQuestion[0]
  });
});



module.exports = router;