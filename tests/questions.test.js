const { question } = require("../src/lib/prisma");
const { request,
  app,
  prisma,
  resetDb,
  registerAndLogin,
  createQuestion, } = require("./helpers");

beforeEach(resetDb);

describe("question tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
  });
});

describe("auth on protected endpoints", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
  });

  it("returns 401 when the header does not start with 'Bearer '", async () => {
    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", "Token abc");
    expect(res.status).toBe(401);
  });

  it("returns 403 when the token is malformed", async () => {
    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", "Bearer not.a.real.jwt");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/questions", () => {
  it("returns questions with data, page, limit, total, totalPages", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      data: expect.any(Array),
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it("does not include user.password in any question in the response", async () => {
    const token = await registerAndLogin();
    await createQuestion(token);
    const res = await request(app)
      .get("/api/questions")
      .set("Authorization", `Bearer ${token}`);
    expect(JSON.stringify(res.body)).not.toContain("password");
  });
});

describe("GET /api/questions/:questionId", () => {
  it("returns 404 for an unknown question", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get("/api/questions/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Question not found");
  });

  it("returns 200 with the correct shape for a known question", async () => {
    const token = await registerAndLogin();
    const created = await createQuestion(token, { question: "What is the capital of Montenegro?", answer: "Podgorica" });
    const res = await request(app)
      .get(`/api/questions/${created.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      question: "What is the capital of Montenegro?",
      answer: "Podgorica",
      userName: "A",
      solved: false,
      keywords: expect.any(Array),
    });
  });
});

describe("POST /api/questions (validation)", () => {
  it("returns 400 when question is missing", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "Podgorica" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when answer is missing", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({ question: "What is the capital of Montenegro?" });
    expect(res.status).toBe(400);
  });

  it("sets userId from the JWT, not from the body", async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .post("/api/questions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        question: "What is the capital of Montenegro?",
        answer: "Podgorica",
        userId: 99999,
      });
    expect(res.status).toBe(201);
    const question = await prisma.question.findUnique({ where: { id: res.body.id } });
    expect(question.userId).not.toBe(99999);
  });
});

describe("DELETE /api/questions/:questionId", () => {
  it("returns 200 and removes the question from the database", async () => {
    const token = await registerAndLogin();
    const question = await createQuestion(token);
    const res = await request(app)
      .delete(`/api/questions/${question.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const after = await prisma.question.findUnique({ where: { id: question.id } });
    expect(after).toBeNull();
  });
});

describe("unknown routes", () => {
  it("returns 404 with a message for an unknown route", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Not found");
  });
});

describe("body parsing", () => {
  it("returns 400 (not 500) for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("{not valid json");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid JSON in request body");
  });


});