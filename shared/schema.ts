import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table definition
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  subscription: text("subscription").default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  enterpriseTeamId: integer("enterprise_team_id"),
  isTeamAdmin: boolean("is_team_admin").default(false),
  hasCompletedTutorial: boolean("has_completed_tutorial").default(false),
});

// Update the insertUserSchema with proper validation
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    email: true,
    password: true,
  })
  .extend({
    email: z.string().email("Invalid email address"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores and hyphens"),
    subscription: z.enum(["free", "pro", "enterprise"]).default("free").optional(),
    subscriptionStatus: z.enum(["active", "inactive", "cancelled"]).default("inactive").optional(),
    hasCompletedTutorial: z.boolean().default(false).optional(),
  });

// New table for enterprise teams
export const enterpriseTeams = pgTable("enterprise_teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  maxMembers: integer("max_members").default(4),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table for feature usage tracking
export const featureUsage = pgTable("feature_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  feature: text("feature").notNull(), // 'calculator', 'research', 'writer'
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const writingTaskStatus = pgEnum("writing_task_status", ["draft", "completed", "reviewing"]);

export const writingTasks = pgTable("writing_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  suggestions: text("suggestions"),
  status: writingTaskStatus("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(),
  output: text("output"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  duration: integer("duration").notNull(), // in minutes
  completed: boolean("completed").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const plagiarismSeverity = pgEnum("plagiarism_severity", ["none", "low", "medium", "high"]);

export const plagiarismChecks = pgTable("plagiarism_checks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  result: jsonb("result").notNull(), // Stores detailed analysis
  severity: plagiarismSeverity("severity").notNull(),
  matchedSources: jsonb("matched_sources"), // URLs or references of matched content
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in cents
  stripePriceId: text("stripe_price_id").notNull(),
  features: jsonb("features").notNull(), // array of features included
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  status: text("status").notNull(), // 'active', 'cancelled', 'past_due'
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userWidgetPreferences = pgTable("user_widget_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  widgetId: text("widget_id").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  position: integer("position").notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiPersonalizationSettings = pgTable("ai_personalization_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  learningStyle: text("learning_style").notNull(), // "visual", "auditory", "reading", "kinesthetic"
  interestAreas: text("interest_areas").array().notNull(),
  communicationStyle: text("communication_style").notNull(), // "formal", "casual", "technical", "simple"
  difficultyPreference: text("difficulty_preference").notNull(), // "beginner", "intermediate", "advanced"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const learningHistory = pgTable("learning_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  topic: text("topic").notNull(),
  engagement: integer("engagement").notNull(), // 1-5 rating
  timeSpent: integer("time_spent").notNull(), // in minutes
  completionStatus: text("completion_status").notNull(), // "completed", "in_progress", "abandoned"
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiLearningPatterns = pgTable("ai_learning_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  pattern: jsonb("pattern").notNull(), // Stores observed patterns like preferred explanation styles
  confidence: integer("confidence").notNull(), // How confident we are about this pattern (0-100)
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userInteractions = pgTable("user_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  feedbackScore: integer("feedback_score"), // User's implicit feedback (time spent, whether they needed clarification)
  context: jsonb("context").notNull(), // The context of the interaction (calculator, writer, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const challengeDifficulty = pgEnum("challenge_difficulty", ["beginner", "intermediate", "advanced", "expert"]);
export const challengeStatus = pgEnum("challenge_status", ["active", "completed", "failed", "expired"]);

export const learningChallenges = pgTable("learning_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "quiz", "project", "research", etc.
  difficulty: challengeDifficulty("difficulty").notNull(),
  points: integer("points").notNull(),
  requirements: jsonb("requirements").notNull(), // Specific completion criteria
  aiPrompt: text("ai_prompt"), // AI-generated guidance
  status: challengeStatus("status").default("active").notNull(),
  deadline: timestamp("deadline"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "streak", "milestone", "skill"
  icon: text("icon").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  experiencePoints: integer("experience_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  streakDays: integer("streak_days").default(0).notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  stats: jsonb("stats").default({}).notNull(), // Various user statistics
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add after userProgress table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  category: text("category").notNull(), // "course", "tutorial", "study_material", "other"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products)
  .extend({
    price: z.number().min(0),
    category: z.enum(["course", "tutorial", "study_material", "other"]),
  })
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;


// Add after the userProgress table
export const motivationTracking = pgTable("motivation_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  engagementScore: integer("engagement_score").notNull(), // 0-100 engagement metric
  lastActivityType: text("last_activity_type").notNull(),
  consecutiveDays: integer("consecutive_days").default(0),
  lastMotivationBoost: timestamp("last_motivation_boost"),
  personalizedTips: jsonb("personalized_tips").default([]),
  learningStreak: integer("learning_streak").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  writingTasks: many(writingTasks),
  codeSnippets: many(codeSnippets),
  studySessions: many(studySessions),
  plagiarismChecks: many(plagiarismChecks),
  subscriptions: many(subscriptions),
  widgetPreferences: many(userWidgetPreferences),
  aiSettings: one(aiPersonalizationSettings, {
    fields: [users.id],
    references: [aiPersonalizationSettings.userId],
  }),
  learningHistory: many(learningHistory),
  learningPatterns: many(aiLearningPatterns),
  interactions: many(userInteractions),
  featureUsage: many(featureUsage),
  team: one(enterpriseTeams, {
    fields: [users.enterpriseTeamId],
    references: [enterpriseTeams.id],
  }),
  challenges: many(learningChallenges),
  achievements: many(userAchievements),
  progress: one(userProgress, {
    fields: [users.id],
    references: [userProgress.userId],
  }),
  motivationTracking: one(motivationTracking, {
    fields: [users.id],
    references: [motivationTracking.userId],
  }),
  products: many(products),
}));

export const enterpriseTeamsRelations = relations(enterpriseTeams, ({ many }) => ({
  members: many(users),
}));

export const insertWritingTaskSchema = createInsertSchema(writingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({
  id: true,
  createdAt: true,
});

export const insertStudySessionSchema = createInsertSchema(studySessions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertPlagiarismCheckSchema = createInsertSchema(plagiarismChecks).omit({
  id: true,
  createdAt: true,
});

export const insertAiPersonalizationSchema = createInsertSchema(aiPersonalizationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningHistorySchema = createInsertSchema(learningHistory).omit({
  id: true,
  createdAt: true,
});

export const insertWidgetPreferenceSchema = createInsertSchema(userWidgetPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnterpriseTeamSchema = createInsertSchema(enterpriseTeams).omit({
  id: true,
  createdAt: true,
});

export const insertFeatureUsageSchema = createInsertSchema(featureUsage).omit({
  id: true,
  lastUsed: true,
});

export const insertLearningChallengeSchema = createInsertSchema(learningChallenges).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  lastActivityAt: true,
  updatedAt: true,
});

// Add schema and types
export const insertMotivationTrackingSchema = createInsertSchema(motivationTracking).extend({
  engagementScore: z.number().min(0).max(100),
  lastActivityType: z.string(),
  consecutiveDays: z.number().min(0),
  learningStreak: z.number().min(0),
  personalizedTips: z.array(z.object({
    area: z.string(),
    tip: z.string()
  })).default([]),
});

export const subscriptionPlanSchema = createInsertSchema(subscriptionPlans).extend({
  stripePriceId: z.string(),
  price: z.number().min(0),
  features: z.array(z.string()),
});


export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WritingTask = typeof writingTasks.$inferSelect;
export type CodeSnippet = typeof codeSnippets.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type PlagiarismCheck = typeof plagiarismChecks.$inferSelect;
export type InsertPlagiarismCheck = typeof plagiarismChecks.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type CodeCollabMessage = {
  type: "code_update" | "cursor_update" | "join_room" | "leave_room";
  roomId: string;
  userId: number;
  username: string;
  content?: string;
  position?: {
    line: number;
    column: number;
  };
};

export const codeCollabRooms = pgTable("code_collab_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
});

export const codeCollabParticipants = pgTable("code_collab_participants", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => codeCollabRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertCodeCollabRoomSchema = createInsertSchema(codeCollabRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CodeCollabRoom = typeof codeCollabRooms.$inferSelect;
export type InsertCodeCollabRoom = typeof codeCollabRooms.$inferInsert;

export type InsertWidgetPreference = z.infer<typeof insertWidgetPreferenceSchema>;
export type WidgetPreference = typeof userWidgetPreferences.$inferSelect;
export type AiPersonalizationSettings = typeof aiPersonalizationSettings.$inferSelect;
export type InsertAiPersonalizationSettings = typeof aiPersonalizationSettings.$inferInsert;
export type LearningHistory = typeof learningHistory.$inferSelect;
export type InsertLearningHistory = typeof learningHistory.$inferInsert;
export type AiLearningPattern = typeof aiLearningPatterns.$inferSelect;
export type UserInteraction = typeof userInteractions.$inferSelect;
export type EnterpriseTeam = typeof enterpriseTeams.$inferSelect;
export type InsertEnterpriseTeam = typeof enterpriseTeams.$inferInsert;
export type FeatureUsage = typeof featureUsage.$inferSelect;
export type InsertFeatureUsage = typeof featureUsage.$inferInsert;

export type LearningChallenge = typeof learningChallenges.$inferSelect;
export type InsertLearningChallenge = typeof learningChallenges.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

export type MotivationTracking = typeof motivationTracking.$inferSelect;
export type InsertMotivationTracking = typeof motivationTracking.$inferInsert;
