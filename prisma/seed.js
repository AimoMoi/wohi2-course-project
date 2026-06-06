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
  },
{
    question: "What is the population of Finland?",
    answer: "5.5 million.",
    keywords: ["finland", "population"]
  },
   {
    question: "What is the capital of Finland?",
    answer: "Helsinki",
    keywords: ["geography", "finland"]
  },
  {
    question: "What is the capital of Sweden?",
    answer: "Stockholm",
    keywords: ["geography", "sweden"]
  },
  {
    question: "What is the capital of France?",
    answer: "Paris",
    keywords: ["geography", "france"]
  },
  {
    question: "What is the largest planet in the Solar System?",
    answer: "Jupiter",
    keywords: ["science", "space"]
  },
  {
    question: "Which planet is known as the Red Planet?",
    answer: "Mars",
    keywords: ["science", "space"]
  },
  {
    question: "What is the chemical symbol for water?",
    answer: "H2O",
    keywords: ["science", "chemistry"]
  },
  {
    question: "What is the boiling point of water in Celsius?",
    answer: "100",
    keywords: ["science", "chemistry"]
  },
  {
    question: "What is the square root of 64?",
    answer: "8",
    keywords: ["math"]
  },
  {
    question: "What is 12 × 12?",
    answer: "144",
    keywords: ["math"]
  },
  {
    question: "What is 25 + 17?",
    answer: "42",
    keywords: ["math"]
  },
  {
    question: "Who painted the Mona Lisa?",
    answer: "Leonardo da Vinci",
    keywords: ["art", "history"]
  },
  {
    question: "Who wrote Hamlet?",
    answer: "William Shakespeare",
    keywords: ["literature"]
  },
  {
    question: "In which country are the pyramids of Giza located?",
    answer: "Egypt",
    keywords: ["history", "geography"]
  },
  {
    question: "What is the longest river in the world?",
    answer: "Nile",
    keywords: ["geography"]
  },
  {
    question: "What is the largest ocean on Earth?",
    answer: "Pacific Ocean",
    keywords: ["geography"]
  },
  {
    question: "What language is spoken in Brazil?",
    answer: "Portuguese",
    keywords: ["language", "geography"]
  },
  {
    question: "What currency is used in Japan?",
    answer: "Yen",
    keywords: ["economics", "japan"]
  },
  {
    question: "What is the fastest land animal?",
    answer: "Cheetah",
    keywords: ["animals"]
  },
  {
    question: "What is the largest mammal?",
    answer: "Blue Whale",
    keywords: ["animals"]
  },
  {
    question: "How many continents are there?",
    answer: "7",
    keywords: ["geography"]
  },
  {
    question: "What is the smallest prime number?",
    answer: "2",
    keywords: ["math"]
  },
  {
    question: "Which continent is Finland located in?",
    answer: "Europe",
    keywords: ["geography", "finland"]
  },
  {
    question: "Who developed the theory of relativity?",
    answer: "Albert Einstein",
    keywords: ["science", "physics"]
  },
  {
    question: "What is the capital of Germany?",
    answer: "Berlin",
    keywords: ["geography", "germany"]
  },
  
];

async function main() {
  
  await prisma.attempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

  // Create a default user
  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
      emailVerified: true
    },
  });

  console.log("Created user:", user.email);

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