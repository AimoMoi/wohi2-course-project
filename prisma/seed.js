const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt")
const prisma = new PrismaClient();

const seedQuestions = [
  {
    question: "What is HTTP?",
    answer: "HTTP is the foundation of communication on the web. It defines how clients and servers exchange data.",
    keywords: ["http", "web"]
  },
  {
    question: "What is REST API?",
    answer: "REST is an architectural style that uses standard HTTP methods like GET, POST, PUT, and DELETE.",
    keywords: ["rest", "api", "http"]
  },
  {
    question: "What does Node.js do?",
    answer: "Node.js allows you to run JavaScript on the server using a non-blocking, event-driven architecture.",
    keywords: ["node.js", "javascript", "server"]
  },
  {
    question: "What do databases do?",
    answer: "Databases store and collect data.",
    keywords: ["database", "data"]
  }
];

async function main() {

  // Create a default user
  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Created user:", user.email);
  
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const q of seedQuestions) {
    await prisma.question.create({
      data: {
        question: q.question,
        answer: q.answer,
        userId: user.id,
        keywords: {
          connectOrCreate: q.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
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
  .finally(() => prisma.$disconnect());