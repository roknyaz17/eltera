export function buildAssessment(profession, questions) {
  return questions.filter((question) => {
    return question.scope === "common" || question.scope === profession.id;
  });
}

export function calculateResult(assessmentQuestions, answersByQuestionId, competencyTitleById) {
  const competencyScores = {};
  let score = 0;
  let maxScore = 0;
  let redFlags = 0;
  const unanswered = [];

  assessmentQuestions.forEach((question) => {
    const selectedIndex = answersByQuestionId[question.id];
    const selectedAnswer = question.answers[selectedIndex];
    const questionMax = Math.max(...question.answers.map((answer) => answer.score));
    const title = competencyTitleById[question.competencyId] || question.competencyId;

    maxScore += questionMax;
    competencyScores[title] ||= { score: 0, maxScore: 0 };
    competencyScores[title].maxScore += questionMax;

    if (!selectedAnswer) {
      unanswered.push(question.id);
      return;
    }

    score += selectedAnswer.score;
    competencyScores[title].score += selectedAnswer.score;
    if (selectedAnswer.redFlag) redFlags += 1;
  });

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const recommendation = getRecommendation(percent, redFlags);

  return {
    score,
    maxScore,
    percent,
    redFlags,
    unanswered,
    recommendation,
    competencyScores
  };
}

export function getRecommendation(percent, redFlags) {
  const levels = [
    "Не рекомендован",
    "Резерв / нужна стажировка",
    "Можно приглашать, нужна проверка",
    "Рекомендован"
  ];

  let index = 0;
  if (percent >= 82) index = 3;
  else if (percent >= 68) index = 2;
  else if (percent >= 52) index = 1;

  if (redFlags >= 2) index = Math.max(0, index - 1);
  return levels[index];
}
