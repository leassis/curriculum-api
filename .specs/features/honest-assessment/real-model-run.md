llm call {
  model: 'deepseek/deepseek-v4-flash',
  inputTokens: 1666,
  outputTokens: 1123,
  totalTokens: 2789,
  latencyMs: 14523
}
tailor assessment notes { restored: 0, collapsed: 1 }
model: deepseek/deepseek-v4-flash
score: 65
missing skills: ["Terraform"]
omissions: [
  {
    "what": "Recipe organiser project (Flutter)",
    "reason": "Not relevant to backend engineering job, omitted to keep focus on relevant skills."
  },
  {
    "what": "Two bullets from Support Analyst role: 'Wrote the first internal knowledge base' and 'Trained new agents on the ticketing system'",
    "reason": "Role ended more than 15 years ago, only one bullet kept per rule."
  },
  {
    "what": "Support Analyst at Contoso Telecom",
    "reason": "Ended more than 15 years ago; shortened to one bullet."
  }
]
PASS absent skill is not in the resume
PASS absent skill is in missing_skills
PASS every omission has a reason
PASS old role has one bullet and no text
