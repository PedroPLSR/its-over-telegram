# Feature Specification: Private Telegram Bot "It's Over"

**Feature Branch**: `001-its-over-bot`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "Bot Telegram privado 'It's Over' para um grupo de amigos. Todo domingo às 18:00 (America/Sao_Paulo) envia um GIF nos chats autorizados; comando /itsOver envia o mesmo GIF se o chat estiver na allowlist; persistência de chat_ids autorizados; silêncio fora da allowlist; secrets só via ambiente; MVP com custo zero da Bot API e hosting mínimo."

## Clarifications

### Session 2026-09-06

- Q: How should the operator add or remove authorized chat IDs for the MVP? → A: Env/config only — operator edits a list of chat IDs and restarts (or reloads config)
- Q: If the bot is offline at Sunday 18:00 America/Sao_Paulo, what should happen when it comes back online? → A: No catch-up — miss the week; wait for next Sunday 18:00 or use `/itsOver`
- Q: In an eligible group chat, who is allowed to trigger `/itsOver` successfully? → A: Any chat member (human) in an eligible chat
- Q: Which Telegram chat types may appear on the allowlist and receive the weekly GIF or `/itsOver`? → A: Groups and supergroups only
- Q: On first deploy, if the bot is already in an allowlisted group but has never seen a join/leave event in this installation, how should “bot is present” be decided? → A: Optimistic — assume present until leave event or send failure proves otherwise

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Envio semanal automático do GIF (Priority: P1)

Como membro do grupo de amigos autorizado, quero receber automaticamente o GIF "It's Over" todo domingo às 18:00 (horário de Brasília), para manter a tradição semanal sem depender de alguém lembrar de enviar.

**Why this priority**: É o comportamento central do produto — a ritualização semanal. Sem isso, o bot não entrega o valor principal.

**Independent Test**: Com o bot ativo e ao menos um chat na allowlist onde o bot ainda está presente, avançar o relógio (ou disparar o agendamento de teste) para domingo 18:00 America/Sao_Paulo e verificar que o GIF chega apenas nesses chats.

**Acceptance Scenarios**:

1. **Given** um ou mais chats na allowlist em que o bot ainda é membro, **When** chega domingo 18:00 no fuso America/Sao_Paulo, **Then** o bot envia o GIF (animation) em cada um desses chats.
2. **Given** um chat que está na allowlist mas o bot não está mais presente, **When** chega domingo 18:00 America/Sao_Paulo, **Then** o bot não envia mensagem para esse chat.
3. **Given** um chat que não está na allowlist, **When** chega domingo 18:00 America/Sao_Paulo, **Then** o bot não envia nada para esse chat.
4. **Given** qualquer dia/hora que não seja domingo 18:00 America/Sao_Paulo, **When** o tempo passa sem o comando manual, **Then** o bot não dispara o envio semanal.
5. **Given** o bot esteve offline durante domingo 18:00 America/Sao_Paulo, **When** o serviço volta depois, **Then** o bot NÃO envia um GIF de compensação; o próximo envio automático é o domingo seguinte às 18:00 (membros podem usar `/itsOver` se quiserem o GIF antes).

---

### User Story 2 - Comando manual /itsOver (Priority: P2)

Como membro de um chat autorizado, quero poder pedir o GIF a qualquer momento com `/itsOver`, para reviver o meme fora do horário semanal.

**Why this priority**: Complementa o ritual semanal e permite validação imediata do bot; ainda depende da allowlist para manter o uso privado.

**Independent Test**: Em um chat allowlisted, enviar `/itsOver` e confirmar o GIF; em um chat não allowlisted, confirmar silêncio.

**Acceptance Scenarios**:

1. **Given** um chat na allowlist onde o bot está presente, **When** qualquer membro humano do chat envia `/itsOver`, **Then** o bot responde enviando o mesmo GIF usado no envio semanal.
2. **Given** um chat fora da allowlist, **When** alguém envia `/itsOver`, **Then** o bot não envia o GIF nem qualquer resposta útil.
3. **Given** o GIF já foi enviado com sucesso pelo menos uma vez, **When** novos envios (semanal ou `/itsOver`) ocorrem, **Then** o bot reutiliza o identificador de arquivo já conhecido pelo Telegram sempre que possível, em vez de reenviar pela URL original.
4. **Given** um chat elegível, **When** o remetente não é um administrador (apenas membro comum), **Then** `/itsOver` ainda funciona — não há restrição a admins no MVP.

---

### User Story 3 - Allowlist e presença do bot (Priority: P3)

Como operador do bot, quero que apenas chats explicitamente autorizados recebam o GIF, e que a lista de chats acompanhe entrada/saída do bot, para que o meme nunca vaze para chats indesejados.

**Why this priority**: Garante o caráter privado do bot; sem isso, o envio semanal e o comando poderiam atingir lugares errados.

**Independent Test**: Adicionar/remover o bot de um chat e alterar a allowlist na configuração/ambiente; verificar que envios só ocorrem na interseção "allowlisted + bot presente".

**Acceptance Scenarios**:

1. **Given** um chat cujo identificador está na allowlist (config/ambiente) e o bot acaba de ser adicionado, **When** o bot registra a mudança de membership, **Then** esse chat passa a ser elegível para envios (semanal e `/itsOver`).
2. **Given** o bot é removido ou sai de um chat allowlisted, **When** a membership muda, **Then** esse chat deixa de receber envios até o bot voltar a estar presente; a allowlist em si não é alterada automaticamente (permanece até o operador editar a configuração).
3. **Given** um chat onde o bot está presente mas o identificador não está na allowlist explícita, **When** ocorre domingo 18:00 ou `/itsOver`, **Then** nenhum GIF é enviado e o bot permanece em silêncio útil.
4. **Given** um chat privado (DM) com o bot, mesmo que o ID apareça na configuração, **When** ocorre domingo 18:00 ou `/itsOver`, **Then** o bot não trata o chat como elegível e não envia o GIF.
5. **Given** primeiro deploy com o bot já membro de um grupo allowlisted e sem evento de join registrado nesta instalação, **When** chega domingo 18:00 ou alguém envia `/itsOver`, **Then** o bot tenta o envio (presença otimista) até um leave ou falha de envio marcar ausência.

---

### Edge Cases

- URL do GIF inválida, inacessível ou expirada no primeiro envio: o envio falha de forma controlada; o bot não inventa conteúdo alternativo; tentativas posteriores podem usar a URL configurada novamente até obter sucesso e guardar o identificador de arquivo.
- Identificador de arquivo previamente guardado torna-se inválido: o bot volta a usar a URL configurada e, se o envio funcionar, atualiza o identificador guardado.
- Relógio / fuso: o disparo semanal deve ocorrer exatamente no domingo 18:00 America/Sao_Paulo (incluindo mudanças de horário de verão se aplicáveis à região — no Brasil atual não há DST, mas o fuso nomeado continua sendo a referência).
- Reinício do processo do bot: presença conhecida e o identificador de arquivo do GIF (se já obtido) devem sobreviver a reinícios; a allowlist continua vindo da configuração/ambiente.
- Janela semanal perdida: se o serviço estiver offline em domingo 18:00 America/Sao_Paulo, esse disparo é perdido (sem catch-up); `/itsOver` permanece disponível em chats elegíveis.
- Comandos ou mensagens que não sejam `/itsOver` em chats allowlisted: o bot não precisa responder (comportamento mínimo; silêncio é aceitável).
- Múltiplos chats allowlisted: o envio semanal deve cobrir todos os elegíveis; falha em um chat não deve impedir tentativa nos demais.
- Token ausente ou inválido: o bot não inicia operação útil; secrets nunca devem aparecer em logs verbosos voltados a usuários finais.
- Identificadores de DM (ou outros tipos) na allowlist de configuração são ignorados para elegibilidade.
- Primeiro deploy sem evento de membership: chats allowlisted (grupo/supergrupo) são tratados como presentes até leave ou falha de envio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST enviar o GIF configurado como animation em todos os chats elegíveis todo domingo às 18:00 no fuso America/Sao_Paulo, somente se o serviço estiver em operação nesse horário; MUST NOT enviar compensação automática por um domingo perdido.
- **FR-014**: Se o serviço estiver indisponível em domingo 18:00 America/Sao_Paulo, o sistema MUST pular esse ciclo semanal; o próximo envio automático MUST ser o domingo seguinte às 18:00 (sem fila de catch-up).
- **FR-002**: O sistema MUST tratar um chat como elegível somente se: (a) o identificador estiver na allowlist explícita, (b) o tipo do chat for grupo ou supergrupo, e (c) o bot ainda estiver presente nesse chat. Chats privados (DM) e outros tipos MUST NOT ser elegíveis mesmo se listados por engano.
- **FR-003**: O sistema MUST aceitar o comando `/itsOver` de qualquer membro humano do chat atual e, quando o chat for elegível, enviar o mesmo GIF do envio semanal; MUST NOT restringir o comando a administradores do grupo no MVP.
- **FR-004**: O sistema MUST permanecer em silêncio útil (sem GIF e sem resposta operacional) quando o chat não for elegível, inclusive para `/itsOver`.
- **FR-005**: O sistema MUST obter o GIF a partir de uma URL HTTP pública configurável no primeiro envio bem-sucedido e, após isso, MUST preferir reutilizar o identificador de arquivo retornado pelo Telegram em envios seguintes.
- **FR-006**: O sistema MUST carregar a allowlist explícita exclusivamente a partir de configuração/ambiente fornecida pelo operador (lista de identificadores de chat); alterações na allowlist no MVP ocorrem editando essa configuração e reiniciando ou recarregando a configuração — sem comandos Telegram de administração e sem painel.
- **FR-007**: O sistema MUST atualizar o estado de presença do bot nos chats a partir de eventos de mudança de membership (entrada/saída) e de falhas de envio que indiquem ausência; presença é estado operacional distinto da allowlist e NÃO altera a lista configurada pelo operador.
- **FR-015**: Na ausência de evento de saída conhecido, o sistema MUST tratar grupos/supergrupos allowlisted como presentes (presença otimista), inclusive no primeiro deploy com o bot já no grupo; MUST marcar como ausente após evento de saída ou falha de envio que prove que o bot não está mais no chat.
- **FR-008**: O sistema MUST exigir allowlist explícita de chats; presença sozinha NÃO autoriza envio.
- **FR-013**: O sistema MUST persistir o estado operacional necessário após reinícios (no mínimo: presença conhecida dos chats e o identificador de arquivo do GIF, quando já obtido); a allowlist em si vem da configuração/ambiente e não depende de UI.
- **FR-009**: Credenciais e segredos (incluindo o token do bot) MUST ser fornecidos apenas via variáveis de ambiente; arquivos de ambiente locais NÃO MUST ser versionados no repositório.
- **FR-010**: O bot MUST ser operado como serviço privado para o grupo de amigos (não divulgado publicamente; join groups desabilitado após adição ao grupo, conforme setup operacional do operador).
- **FR-011**: O MVP MUST funcionar sem painel web, sem inteligência artificial, sem pagamentos, sem obrigação de webhook, sem rotação aleatória de múltiplos GIFs, sem painel admin e sem broadcast massivo fora da allowlist.
- **FR-012**: O custo da Bot API Telegram MUST permanecer zero para o operador no MVP; a operação MUST ser viável com hospedagem mínima (sem exigir infraestrutura de webhook dedicado no MVP).

### Key Entities

- **Chat autorizado**: Identificador de chat Telegram de grupo ou supergrupo presente na allowlist explícita (fonte: configuração/ambiente do operador); elegível para envio apenas enquanto o bot estiver presente.
- **Presença do bot**: Estado operacional indicando se o bot ainda participa do chat; inicia otimista para chats allowlisted (assume presente até prova em contrário), atualizado por eventos de membership e por falhas de envio.
- **GIF "It's Over"**: Conteúdo de animation único do MVP, referenciado por URL configurável e, após o primeiro sucesso, por identificador de arquivo reutilizável.
- **Agendamento semanal**: Regra de disparo fixa — domingo 18:00 America/Sao_Paulo — aplicada aos chats elegíveis.
- **Segredo operacional**: Token e demais valores sensíveis injetados pelo ambiente de execução, não pelo repositório.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das ocorrências de domingo 18:00 America/Sao_Paulo com o serviço ativo nesse horário, todos os chats elegíveis recebem o GIF dentro de 2 minutos após o horário agendado; se o serviço estiver offline nesse instante, a ausência de envio (sem catch-up) é o comportamento esperado.
- **SC-002**: Em chats elegíveis, `/itsOver` resulta no envio do GIF em menos de 5 segundos sob condições normais de rede, em pelo menos 95% das tentativas de teste.
- **SC-003**: Em 100% dos testes com chat fora da allowlist (ou bot ausente), nenhum GIF é enviado e nenhuma resposta útil é produzida.
- **SC-004**: Após o primeiro envio bem-sucedido do GIF, pelo menos 95% dos envios seguintes reutilizam o identificador de arquivo já conhecido (sem depender novamente da URL), salvo invalidação do arquivo.
- **SC-005**: Após reinício do serviço, a allowlist (lida da configuração/ambiente) e o identificador de arquivo (se já existia) permanecem disponíveis e o comportamento de envio continua correto sem reconfiguração manual dos chats além da própria config.
- **SC-006**: Operadores conseguem colocar o bot em operação no grupo de amigos (token via ambiente, allowlist, GIF configurado) em menos de 30 minutos seguindo o procedimento documentado do MVP.

## Assumptions

- Existe um único GIF configurável por URL para todo o MVP (sem biblioteca de mídias nem rotação).
- A allowlist explícita é mantida somente via configuração/ambiente (lista de chat IDs); o operador edita e reinicia/recarrega. Sem comandos `/allow`/`/deny`, sem arquivo admin dedicado além dessa config, e sem UI no MVP.
- "Silêncio útil" significa não enviar o GIF e não responder de forma que ajude um estranho a descobrir ou usar o bot; logs internos do operador são permitidos.
- O público-alvo é um grupo pequeno de amigos; volume de mensagens e número de chats allowlisted é baixo (ordem de unidades, não milhares).
- O operador configura o BotFather (desabilitar join groups após adicionar ao grupo) e não divulga o username; isso é procedimento operacional, não uma tela do produto.
- Hospedagem mínima / recebimento contínuo de atualizações sem webhook dedicado é aceitável no MVP.
- Arquivos `.env` e similares permanecem fora do controle de versão.
- Não há requisito de multi-idioma, moderação avançada, ou comandos além de `/itsOver` no MVP.
- Não há catch-up automático para domingo perdido por downtime; membros usam `/itsOver` se quiserem o GIF fora do horário.
- Em chats elegíveis, qualquer membro humano pode usar `/itsOver`; não há allowlist de usuários no MVP (apenas de chats).
- O MVP cobre apenas grupos e supergrupos; DMs e outros tipos de chat ficam fora de escopo mesmo que um ID seja colocado na config por engano.
- Presença é otimista: allowlisted group/supergroup assume bot presente até leave ou falha de envio; não exige re-adicionar o bot após o deploy.
- Falhas transitórias de rede no envio semanal podem ser retentadas de forma limitada dentro da janela de sucesso de SC-001 enquanto o serviço está ativo no horário; falha definitiva em um chat não cancela os demais. Indisponibilidade do serviço no horário agendado não gera reenvio posterior automático.
