export type Profile = {
  id: string
  name: string
  role: 'admin' | 'collaborator'
  avatar_url: string | null
  created_at: string
}

export type Client = {
  id: string
  name: string
  slug: string
  niche: string | null
  logo_url: string | null
  status: 'active' | 'paused' | 'archived'
  contract_value: number | null
  contract_status: 'active' | 'pending' | 'overdue'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ClientAsset = {
  id: string
  client_id: string
  type: 'logo' | 'styleguide' | 'brandvoice' | 'font' | 'product' | 'other'
  name: string
  file_url: string | null
  content: string | null
  created_at: string
}

export type ContentType = 'post' | 'reel' | 'stories' | 'email' | 'video' | 'blog' | 'ad' | 'other'

export type Job = {
  id: string
  client_id: string
  title: string
  description: string | null
  status: 'backlog' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  content_type: ContentType | null
  template_id: string | null
  assigned_to: string | null
  created_by: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  client?: Pick<Client, 'id' | 'name' | 'logo_url'>
  briefing?: JobBriefing | null
}

export type ApprovalStage = 'draft' | 'internal_review' | 'client_review' | 'approved' | 'published' | 'rejected'

export type JobOutput = {
  id: string
  job_id: string
  client_id: string
  agent_id: string
  agent_name: string
  input_prompt: string
  output_content: string
  output_type: 'text' | 'copy' | 'strategy' | 'script' | 'image_prompt'
  status: 'pending' | 'approved' | 'rejected' | 'revision'
  approval_stage: ApprovalStage
  output_version: number
  feedback: string | null
  created_at: string
  job?: Pick<Job, 'id' | 'title'>
  client?: Pick<Client, 'id' | 'name'>
}

// ── Fase 2: Briefing ─────────────────────────────────────────

export type JobBriefing = {
  id: string
  job_id: string
  content_type: ContentType
  objective: string | null
  target_audience: string | null
  key_message: string | null
  tone: string | null
  restrictions: string | null
  deadline_notes: string | null
  reference_urls: string[]
  custom_fields: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Fase 2: Aprovação ─────────────────────────────────────────

export type OutputApprovalEvent = {
  id: string
  output_id: string
  from_stage: ApprovalStage | null
  to_stage: ApprovalStage
  changed_by: string
  notes: string | null
  created_at: string
  profile?: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

// ── Fase 2: Pipelines ─────────────────────────────────────────

export type PipelineStep = {
  order: number
  agent_id: string
  instruction_template: string
}

export type AgentPipeline = {
  id: string
  name: string
  description: string | null
  steps: PipelineStep[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PipelineRunResult = {
  step: number
  agent_id: string
  output_id: string
  content_preview: string
  completed_at: string
}

export type PipelineRun = {
  id: string
  pipeline_id: string | null
  job_id: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  current_step: number
  results: PipelineRunResult[]
  error_message: string | null
  started_by: string | null
  started_at: string
  completed_at: string | null
  pipeline?: Pick<AgentPipeline, 'id' | 'name'>
  job?: Pick<Job, 'id' | 'title'>
}

// ── Fase 2: Templates ─────────────────────────────────────────

export type JobTemplate = {
  id: string
  name: string
  description: string | null
  content_type: ContentType | null
  default_agents: string[]
  briefing_template: Partial<Omit<JobBriefing, 'id' | 'job_id' | 'created_by' | 'created_at' | 'updated_at'>>
  pipeline_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Fase 2: Attachments ───────────────────────────────────────

export type FileType = 'image' | 'pdf' | 'doc' | 'video' | 'other'

export type JobAttachment = {
  id: string
  job_id: string
  client_id: string
  name: string
  file_url: string
  storage_path: string
  file_type: FileType
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

// ── Fase 2: Notificações ──────────────────────────────────────

export type NotificationType =
  | 'job_overdue'
  | 'approval_pending'
  | 'output_ready'
  | 'pipeline_complete'
  | 'revision_requested'
  | 'stage_changed'

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  read: boolean
  link: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ── Fase 3: Portal do Cliente ─────────────────────────────────

export type ClientRole = 'admin' | 'collaborator' | 'client'

export interface ClientInvite {
  id: string
  client_id: string
  email: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  token: string
  created_at: string
}

// ── Fase 3: Integrações ──────────────────────────────────────

export type IntegrationType = 'whatsapp' | 'instagram' | 'meta_ads' | 'google_analytics'

export interface IntegrationConfig {
  id: string
  client_id: string
  type: IntegrationType
  config: Record<string, unknown>
  is_active: boolean
  last_sync_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ScheduledPostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'

export interface ScheduledPost {
  id: string
  client_id: string
  output_id: string
  platform: 'instagram' | 'facebook' | 'both'
  caption: string | null
  media_urls: string[]
  publish_at: string
  published_at: string | null
  status: ScheduledPostStatus
  platform_post_id: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MetaCampaign {
  id: string
  client_id: string
  campaign_id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string | null
  spend: number
  impressions: number
  clicks: number
  ctr: number | null
  cpc: number | null
  conversions: number
  period_start: string
  period_end: string
  synced_at: string
  created_at: string
}

// ── Fase 3: Relatórios ───────────────────────────────────────

export type ReportFormat = 'pdf' | 'excel'
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed'

export interface Report {
  id: string
  client_id: string
  title: string
  period_start: string
  period_end: string
  format: ReportFormat
  sections: string[]
  file_url: string | null
  status: ReportStatus
  generated_at: string | null
  generated_by: string | null
  created_at: string
  client?: Pick<Client, 'id' | 'name'>
}

export interface ReportShare {
  id: string
  report_id: string
  token: string
  expires_at: string
  views: number
  created_by: string | null
  created_at: string
}

// ── Fase 3: CRM ──────────────────────────────────────────────

export type LeadStage = 'prospect' | 'contacted' | 'proposal_sent' | 'negotiation' | 'won' | 'lost'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'whatsapp'

export interface Lead {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  stage: LeadStage
  deal_value: number | null
  source: string | null
  assigned_to: string | null
  converted_client_id: string | null
  notes: string | null
  lost_reason: string | null
  expected_close: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assigned_profile?: Pick<Profile, 'id' | 'name' | 'avatar_url'>
  tags?: LeadTag[]
}

export interface LeadActivity {
  id: string
  lead_id: string
  type: ActivityType
  title: string
  body: string | null
  performed_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface LeadTag {
  id: string
  name: string
  color: string
  created_at: string
}

// ── Fase 3: Versioning ───────────────────────────────────────

export interface OutputVersion {
  id: string
  output_id: string
  version_number: number
  content: string
  changed_by: string | null
  change_note: string | null
  created_at: string
}

// ── Fase 3: Email ─────────────────────────────────────────────

export interface EmailLog {
  id: string
  to_email: string
  subject: string
  template: string
  status: 'sent' | 'failed' | 'bounced'
  resend_id: string | null
  metadata: Record<string, unknown>
  sent_at: string
}
