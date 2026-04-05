import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? 'Agency OS <noreply@agencyos.com.br>'

// ── Templates ───────────────────────────────────────────────────────────────

function baseLayout(content: string, previewText = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agency OS</title>
</head>
<body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:20px;font-weight:700;color:#F59E0B;letter-spacing:-0.5px;">Agency OS</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#18181B;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:36px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#52525B;">
            Agency OS · Plataforma Interna de Operações<br/>
            <a href="https://agencyos.com.br" style="color:#F59E0B;text-decoration:none;">agencyos.com.br</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function welcomeHtml(name: string) {
  const firstName = name.split(' ')[0]
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#FAFAFA;">
      Bem-vindo(a), ${firstName}! 👋
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#A1A1AA;line-height:1.6;">
      Sua conta no <strong style="color:#FAFAFA;">Agency OS</strong> foi criada com sucesso.
      A plataforma de operações da agência está pronta para você.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${[
        ['🤖', 'Oracle AI', 'Orquestre agentes de IA para copy, design e áudio'],
        ['👥', 'Clientes & Jobs', 'Gerencie clientes, briefings e entregas'],
        ['📊', 'Métricas', 'Acompanhe resultados e relatórios em tempo real'],
      ].map(([icon, title, desc]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:18px;margin-right:12px;">${icon}</span>
          <strong style="color:#FAFAFA;font-size:14px;">${title}</strong>
          <p style="margin:2px 0 0 30px;font-size:13px;color:#71717A;">${desc}</p>
        </td>
      </tr>`).join('')}
    </table>

    <a href="https://agencyos.com.br"
       style="display:inline-block;background:#F59E0B;color:#0A0A0A;font-weight:700;font-size:14px;
              padding:12px 28px;border-radius:8px;text-decoration:none;">
      Acessar Agency OS →
    </a>
  `, `Bem-vindo(a) ao Agency OS, ${firstName}!`)
}

export function notificationHtml(opts: {
  title: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  type?: 'info' | 'success' | 'warning'
}) {
  const colors = {
    info: '#F59E0B',
    success: '#22C55E',
    warning: '#EF4444',
  }
  const accent = colors[opts.type ?? 'info']

  return baseLayout(`
    <div style="width:36px;height:4px;background:${accent};border-radius:2px;margin-bottom:24px;"></div>
    <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#FAFAFA;">${opts.title}</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#A1A1AA;line-height:1.6;">${opts.body}</p>
    ${opts.ctaLabel && opts.ctaUrl ? `
    <a href="${opts.ctaUrl}"
       style="display:inline-block;background:${accent};color:#0A0A0A;font-weight:700;font-size:14px;
              padding:12px 24px;border-radius:8px;text-decoration:none;">
      ${opts.ctaLabel}
    </a>` : ''}
  `, opts.title)
}

// ── Send helpers ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Bem-vindo(a) ao Agency OS, ${name.split(' ')[0]}! 🎉`,
    html: welcomeHtml(name),
  })
}

export async function sendNotificationEmail(opts: {
  to: string
  title: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  type?: 'info' | 'success' | 'warning'
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.title,
    html: notificationHtml(opts),
  })
}

export async function sendJobAssignedEmail(opts: {
  to: string
  userName: string
  jobTitle: string
  clientName: string
  jobUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Novo job atribuído: ${opts.jobTitle}`,
    html: notificationHtml({
      title: `Novo job: ${opts.jobTitle}`,
      body: `Olá, ${opts.userName.split(' ')[0]}! O job <strong style="color:#FAFAFA;">${opts.jobTitle}</strong> do cliente <strong style="color:#FAFAFA;">${opts.clientName}</strong> foi atribuído a você.`,
      ctaLabel: 'Ver Job →',
      ctaUrl: opts.jobUrl,
      type: 'info',
    }),
  })
}

export async function sendApprovalEmail(opts: {
  to: string
  clientName: string
  outputType: string
  approvalUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Aprovação pendente — ${opts.clientName}`,
    html: notificationHtml({
      title: 'Entrega aguardando aprovação',
      body: `Uma entrega do tipo <strong style="color:#FAFAFA;">${opts.outputType}</strong> para o cliente <strong style="color:#FAFAFA;">${opts.clientName}</strong> está aguardando sua revisão e aprovação.`,
      ctaLabel: 'Revisar entrega →',
      ctaUrl: opts.approvalUrl,
      type: 'warning',
    }),
  })
}
