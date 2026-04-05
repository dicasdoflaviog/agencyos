-- Remove the agent CHECK constraint to support all 22 agents
-- (was limited to oracle, vera, atlas only)
ALTER TABLE agent_conversations
  DROP CONSTRAINT IF EXISTS agent_conversations_agent_check;
