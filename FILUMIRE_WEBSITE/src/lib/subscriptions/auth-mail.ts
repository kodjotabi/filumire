import { connect, type TLSSocket } from 'node:tls';
export type Mail = {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    body: string;
};
export type SmtpConfig = {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
};
const hosts = new Set(['smtp.zoho.com', 'smtppro.zoho.com', 'smtp.zoho.eu', 'smtppro.zoho.eu', 'smtp.zoho.in', 'smtppro.zoho.in', 'smtp.zoho.com.au', 'smtppro.zoho.com.au', 'smtp.zoho.jp', 'smtppro.zoho.jp', 'smtp.zoho.ca', 'smtppro.zoho.ca']);
const senders = new Set(['info@filumire.com', 'schools@filumire.com', 'hello@filumire.com']);
export function authSmtpConfiguration(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
    if (env.FILUMIRE_AUTH_EMAIL_ENABLED !== 'true')
        return null;
    const { FILUMIRE_SMTP_HOST: host, FILUMIRE_SMTP_USER: user, FILUMIRE_SMTP_PASSWORD: password, FILUMIRE_SMTP_FROM: from } = env;
    if (!host || !hosts.has(host) || !user || !password || !from || !senders.has(from) || env.FILUMIRE_SMTP_PORT !== '465')
        return null;
    return { host, port: 465, user, password, from };
}
export function encodeMail(mail: Mail): string {
    for (const value of [mail.from, mail.to, mail.replyTo])
        if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value))
            throw new Error('Invalid mail address');
    const subject = '=?UTF-8?B?' + Buffer.from(mail.subject).toString('base64') + '?=';
    const body = Buffer.from(mail.body, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
    return ['From: FILUMIRE <' + mail.from + '>', 'To: ' + mail.to, 'Reply-To: ' + mail.replyTo, 'Subject: ' + subject, 'Date: ' + new Date().toUTCString(), 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body].join('\r\n');
}
/** Minimal implicit-TLS SMTP transport. Certificates are verified; no insecure fallback. */
export async function sendAuthSmtp(config: SmtpConfig, mail: Mail): Promise<void> {
    if (mail.from !== config.from)
        throw new Error('Unapproved mail routing');
    const socket: TLSSocket = connect({ host: config.host, port: config.port, servername: config.host, rejectUnauthorized: true, minVersion: 'TLSv1.2' });
    let buffer = '';
    const responses: Array<{
        code: number;
        text: string;
    }> = [];
    let waiter: ((value: {
        code: number;
        text: string;
    }) => void) | null = null;
    let rejecter: ((reason: Error) => void) | null = null;
    let failure: Error | null = null;
    const fail = () => { failure = new Error('Mail transport failed'); rejecter?.(failure); waiter = null; rejecter = null; };
    socket.setTimeout(12000, () => { fail(); socket.destroy(); });
    socket.on('error', fail);
    socket.on('end', () => {
        if (waiter)
            fail();
    });
    socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        if (buffer.length > 32768) {
            fail();
            socket.destroy();
            return;
        }
        let end;
        while ((end = buffer.indexOf('\r\n')) >= 0) {
            const line = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const m = line.match(/^(\d{3}) (.*)$/);
            if (m) {
                const response = { code: +m[1], text: m[2] };
                if (waiter) {
                    const resolve = waiter;
                    waiter = null;
                    rejecter = null;
                    resolve(response);
                }
                else
                    responses.push(response);
            }
        }
    });
    const response = () => failure ? Promise.reject(failure) : responses.length ? Promise.resolve(responses.shift()!) : new Promise<{
        code: number;
        text: string;
    }>((resolve, reject) => { waiter = resolve; rejecter = reject; });
    const expect = async (expected: number) => {
        if ((await response()).code !== expected)
            throw new Error('Mail server rejected request');
    };
    const command = async (value: string, expected: number) => { socket.write(value + '\r\n'); await expect(expected); };
    const totalTimeout = setTimeout(() => { fail(); socket.destroy(); }, 45000);
    try {
        await expect(220);
        await command('EHLO filumire.com', 250);
        await command('AUTH LOGIN', 334);
        await command(Buffer.from(config.user).toString('base64'), 334);
        await command(Buffer.from(config.password).toString('base64'), 235);
        await command('MAIL FROM:<' + mail.from + '>', 250);
        await command('RCPT TO:<' + mail.to + '>', 250);
        await command('DATA', 354);
        socket.write(encodeMail(mail) + '\r\n.\r\n');
        await expect(250);
        socket.write('QUIT\r\n');
    }
    finally {
        clearTimeout(totalTimeout);
        socket.end();
        socket.destroy();
    }
}
