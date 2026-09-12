# 🛤️ Trilha 04 — Web, Redes & HTTP

> **Fase do board:** F2 — Desenvolvimento Web (estágios 6–10) · **Duração:** 3–4 semanas · **Pré-requisito:** Trilha 01

## 🎯 Objetivo

Entender como a internet e a web funcionam de ponta a ponta — DNS, domínios, URLs,
HTTP, cliente-servidor, MVC — cobrindo os estágios "Redes e Internet" e
"Fundamentos da WEB" do board.

## 📦 Módulos

### M1 — Como a internet funciona (1 semana)

- ✅ [CS50 Understanding Technology — Week 2: Internet](https://cs50.harvard.edu/technology/2017/weeks/2/)
  *(correção: a semana é "Internet", não "Programming Languages" como no board)*
- ✅ [How does the Internet work? (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work)
- ✅ [How DNS works](https://howdns.works/ep1/) — HQ interativa em capítulos curtos.
- ✅ [What is a domain name? (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_domain_name)
- ✅ [What is a URL? (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL) — estrutura de URL, tópico listado no board.
- ✅ [What are hyperlinks? (MDN)](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_are_hyperlinks)

**Checkpoint:** desenhar o caminho completo `digitar URL → DNS → TCP/IP → resposta`
num diagrama de 1 página.

### M2 — HTTP na prática (1 semana)

- ✅ [Uma visão geral do HTTP (MDN)](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Overview)
- ✅ [HTTP Status Codes (Microsoft Learn)](https://learn.microsoft.com/en-us/troubleshoot/developer/webapps/iis/health-diagnostic-performance/http-status-code)
- ✅ [O que é HTTP/3 (Kinsta)](https://kinsta.com/pt/blog/http3/) — evolução do protocolo, QUIC/UDP.
- ✅ [What is JSON? (Oracle)](https://www.oracle.com/br/database/what-is-json/) — formato de troca de dados.
- ✅ [Cookies (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) e
  ✅ [Session (MDN)](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Session)

**Checkpoint:** usar `curl -v` para dissecar uma requisição real (headers, status, corpo)
e classificar 10 status codes de memória.

### M3 — Cliente-servidor, web server e MVC (1 semana)

- ✅ [Client-Server overview (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview)
- ✅ [What is a web server? (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_web_server)
- ✅ [Browsing the web (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Getting_started/Environment_setup/Browsing_the_web)
- ✅ [Diferença entre web server e application server (AWS)](https://aws.amazon.com/pt/compare/the-difference-between-web-server-and-application-server/)
- ✅ [How the web works (MDN)](https://developer.mozilla.org/pt-BR/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)
- Tópico do board: **MVC** — mapear Model/View/Controller num framework que você conheça.

**Checkpoint:** explicar a diferença entre web server e app server com exemplo
(nginx na frente + app Flask/Express atrás).

### M4 (opcional) — Web full-stack guiado

- ✅ [CS50's Web Programming with Python and JavaScript](https://cs50.harvard.edu/web/) —
  Flask, SQL, JS, Django; usar como projeto extensivo se quiser ir além.
- ✅ [CS50 Understanding Technology — Week 5: Web Development](https://cs50.harvard.edu/technology/2017/weeks/5/) — visão rápida de HTML/CSS/JS/HTTP.

## 🛠️ Projeto prático

**Cliente HTTP didático**: script que faz GET/POST contra httpbin.org, imprime
status/headers/body e segue 3 redirects, documentando cada passo.

## 🏁 Critérios de conclusão

- [ ] Diagrama do fluxo URL→DNS→resposta (próprio, não copiado).
- [ ] 10 status codes classificados de memória.
- [ ] Explicar cookies × session × token com caso de uso para cada.
- [ ] Cliente HTTP didático funcionando no repo.

**Próxima:** [Trilha 05 — APIs & Integrações](./trilha-05-apis-integracoes.md) ·
[Caching (MDN)](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/Caching) entra na Trilha 14.
