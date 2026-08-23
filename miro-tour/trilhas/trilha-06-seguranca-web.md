# 🛤️ Trilha 06 — Segurança Web

> **Fase do board:** F2 — Segurança (estágio 7) · **Duração:** 3–4 semanas · **Pré-requisito:** Trilha 04

## 🎯 Objetivo

Dominar os fundamentos de segurança de aplicações web: OWASP Top 10, autenticação ×
autorização, JWT, CORS, HTTPS/SSL, SQL injection, criptografia e ataques de rede
(DDoS, VPN, WAF).

## 📦 Módulos

### M1 — Base conceitual (1 semana)

- ✅ [CS50 Understanding Technology — Week 4: Security](https://cs50.harvard.edu/technology/2017/weeks/4/) — criptografia, ataques, defesa.
- ⚠️ [Cryptography and its types (GeeksforGeeks)](https://www.geeksforgeeks.org/cryptography-and-its-types/)
- ⚠️ [Cyber Security Tutorial (GeeksforGeeks)](https://www.geeksforgeeks.org/cyber-security-tutorial/)
- ✅ [Why is HTTP not secure? (Cloudflare)](https://www.cloudflare.com/pt-br/learning/ssl/why-is-http-not-secure/) — por que HTTPS importa.

**Checkpoint:** explicar criptografia simétrica × assimétrica e o papel de cada uma no TLS.

### M2 — Autenticação & autorização (1 semana)

- ✅ [Autenticação × Autorização — qual a diferença? (freeCodeCamp)](https://www.freecodecamp.org/portuguese/news/autenticacao-x-autorizacao-qual-e-a-diferenca/)
- ✅ [O que é login? (Tecnoblog)](https://tecnoblog.net/responde/o-que-e-login/)
- ✅ [JWT — JSON Web Tokens](https://jwt.io/) — decodificar tokens no debugger.
- ✅ [Session (MDN)](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Session) e
  ✅ [Cookies (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) — sessão × token.

**Checkpoint:** implementar login com e-mail/senha (requisito 1 do e-commerce) emitindo
JWT; explicar o que vai no payload × o que nunca deve ir.

### M3 — Vulnerabilidades web — OWASP (1 semana)

- ✅ [OWASP Top Ten Web Application Security Risks](https://owasp.org/www-project-top-ten/)
- ⚠️ [SQL Injection (GeeksforGeeks)](https://www.geeksforgeeks.org/sql-injection/) — fecha o loop da Trilha 03.
- ✅ [Understand CORS issues (Microsoft Learn)](https://learn.microsoft.com/pt-br/entra/identity/app-proxy/application-proxy-understand-cors-issues)

**Prática:** explorar um alvo legal (DVWA ou PortSwigger Web Security Academy labs)
e reproduzir SQL injection + XSS controlados.

**Checkpoint:** mapear os 10 riscos OWASP na sua API do e-commerce: quais se aplicam,
como estão mitigados.

### M4 — Perímetro e rede (0,5 semana)

- ⚠️ [What is a VPN? (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-vpn-how-it-works-types-of-vpn/)
- ⚠️ [What is a DDoS attack? (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-ddosdistributed-denial-of-service/)
- ⚠️ [What is a Web Application Firewall? (GeeksforGeeks)](https://www.geeksforgeeks.org/what-is-a-web-application-firewall/)

**Checkpoint:** explicar a diferença entre WAF, firewall de rede e rate limiting
(rate limiting aprofunda na Trilha 14).

## 🛠️ Projeto prático

**Checklist de segurança do e-commerce**: documento no repo mapeando os 6 requisitos
do caso de estudo (`../05-requisitos-nfrs.md`) contra controles (login seguro,
confirmação por e-mail, CORS restrito, HTTPS, prepared statements).

## 🏁 Critérios de conclusão

- [ ] Login JWT funcionando com hash de senha (bcrypt/argon2) — nunca senha em claro.
- [ ] OWASP Top 10 mapeado no projeto com mitigação anotada para cada item.
- [ ] SQL injection reproduzida em lab e corrigida com query parametrizada.
- [ ] Explicar session × JWT × OAuth em ≤ 5 linhas cada.

**Próxima:** [Trilha 07 — Git, Docker & CI/CD](./trilha-07-git-docker-cicd.md)
