/**
 * Model selection per agent — cost/capability hierarchy via OpenRouter
 */

export const AGENT_MODELS: Record<string, string> = {
  // ── Brain (highest quality)
  oracle:    'anthropic/claude-sonnet-4-5',
  genesis:   'anthropic/claude-sonnet-4-5',
  lore:      'anthropic/claude-sonnet-4-5',

  // ── DNA / File processing (cost-efficient)
  dna:       'openai/gpt-4o-mini',
  knowledge: 'openai/gpt-4o-mini',

  // ── Production agents
  vance:     'qwen/qwen3-235b-a22b:free',
  vera:      'qwen/qwen3-235b-a22b:free',
  marco:     'qwen/qwen3-235b-a22b:free',
  atlas:     'openai/gpt-4o-mini',
  volt:      'qwen/qwen3-235b-a22b:free',
  pulse:     'qwen/qwen3-235b-a22b:free',
  cipher:    'qwen/qwen3-235b-a22b:free',
  flux:      'qwen/qwen3-235b-a22b:free',
  nexus:     'qwen/qwen3-235b-a22b:free',
  vox:       'qwen/qwen3-235b-a22b:free',

  // ── Intelligence
  iris:      'openai/gpt-4o-mini',
  vector:    'openai/gpt-4o-mini',
  prism:     'qwen/qwen3-235b-a22b:free',

  // ── Operations
  bridge:    'qwen/qwen3-235b-a22b:free',
  aegis:     'openai/gpt-4o-mini',
  harbor:    'qwen/qwen3-235b-a22b:free',
  ledger:    'openai/gpt-4o-mini',
  surge:     'qwen/qwen3-235b-a22b:free',
  anchor:    'qwen/qwen3-235b-a22b:free',

  // ── Classifier (cheapest possible)
  classifier: 'google/gemma-3-4b-it:free',
}

export function getProviderModel(agent: string): string {
  return AGENT_MODELS[agent] ?? AGENT_MODELS.oracle
}
