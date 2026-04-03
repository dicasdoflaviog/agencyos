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

export type Job = {
  id: string
  client_id: string
  title: string
  description: string | null
  status: 'backlog' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string | null
  created_by: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  client?: Pick<Client, 'id' | 'name' | 'logo_url'>
}

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
  feedback: string | null
  created_at: string
  job?: Pick<Job, 'id' | 'title'>
  client?: Pick<Client, 'id' | 'name'>
}
