const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "What is HTTP?",
    answer: "HTTP is the foundation of communication on the web. It defines how clients and servers exchange data.",
  },
  {
    question: "What is REST API?",
    answer: "REST is an architectural style that uses standard HTTP methods like GET, POST, PUT, and DELETE.",
  },
  {
    question: "What does Node.js do?",
    answer: "Node.js allows you to run JavaScript on the server using a non-blocking, event-driven architecture.",
  },
  {
    question: "What do databases do?",
    answer: "Databases store and collect data.",
  }
];

async function main() {
  await prisma.question.deleteMany();

  for (const q of seedQuestions) {
    await prisma.question.create({
      data: {
        question: q.question,
        answer: q.answer,
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });