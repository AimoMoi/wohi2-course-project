const CONFIG = {
  API_URL: "",
  ROUTES: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    QUESTIONS: "/api/questions",
  },
  FIELDS: {
    LOGIN: ["email", "password"],
    REGISTER: ["email", "password", "name"],
    QUESTION: ["question", "answer", "keywords"],
  },
  QUESTIONS_PER_PAGE: 5,
  STORAGE_KEY: "jwt_token",
  RECAPTCHA_SITE_KEY: "6LfN1w4tAAAAAF7QLmqY7tQF-kwk55Jse6DbOwWz",
  API_FIELDS: {
    SOLVED: "solved",
  },
};
