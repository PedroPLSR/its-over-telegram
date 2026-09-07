# Feature Specification: Countdown no /itsOver

**Feature Branch**: `feat/ansioso_pelo_domingo`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "Alterar o comando /itsOver para responder com as horas restantes até o próximo domingo às 18:00 em America/Sao_Paulo, sem enviar GIF. O GIF deve ser enviado exclusivamente pelo job semanal automático nesse horário, preservando elegibilidade, silêncio útil, presença otimista, configuração por ambiente e ausência de catch-up."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar o tempo restante (Priority: P1)

Como membro de um grupo elegível, quero usar `/itsOver` para saber quantas horas faltam até o próximo envio semanal, para acompanhar a espera sem antecipar o GIF.

**Why this priority**: É a principal mudança percebida pelos usuários e impede que o comando manual quebre a expectativa do ritual semanal.

**Independent Test**: Em diferentes dias e horários, usar `/itsOver` em um grupo elegível e verificar que a resposta contém a quantidade inteira correta de horas até o próximo domingo às 18:00 no fuso America/Sao_Paulo e não contém GIF.

**Acceptance Scenarios**:

1. **Given** um grupo elegível e um instante anterior ao próximo domingo às 18:00, **When** um membro usa `/itsOver`, **Then** o bot responde com `Ei, calma.. Faltam X horas pro Gif`, substituindo X pelo total de horas restantes arredondado para cima, e não envia GIF.
2. **Given** que faltam 2 horas e 1 minuto para o próximo domingo às 18:00, **When** um membro usa `/itsOver` em grupo elegível, **Then** X é 3.
3. **Given** que falta menos de 1 hora para o próximo domingo às 18:00, **When** um membro usa `/itsOver` em grupo elegível, **Then** X é 1, evitando informar zero antes do horário.
4. **Given** domingo exatamente às 18:00 ou durante o mesmo minuto do disparo semanal, **When** um membro usa `/itsOver` em grupo elegível, **Then** o comando não envia GIF e calcula X até o domingo seguinte às 18:00; o job semanal continua independente.

---

### User Story 2 - Preservar o envio semanal exclusivo (Priority: P2)

Como membro de um grupo elegível, quero que o GIF continue chegando automaticamente no horário semanal, para que o meme permaneça reservado ao ritual de domingo.

**Why this priority**: Mantém o valor central existente e estabelece que somente o disparo automático pode enviar o GIF.

**Independent Test**: Manter o serviço ativo ao chegar domingo às 18:00 America/Sao_Paulo e verificar que o job envia o GIF aos grupos elegíveis, enquanto invocações do comando não o enviam.

**Acceptance Scenarios**:

1. **Given** um grupo elegível e o serviço ativo, **When** chega domingo às 18:00 America/Sao_Paulo, **Then** o job semanal envia o GIF como animation.
2. **Given** o serviço ficou offline no horário semanal, **When** volta a operar depois, **Then** nenhum GIF de compensação é enviado.
3. **Given** um membro usa `/itsOver` no mesmo instante em que o job semanal executa, **When** os dois eventos são processados, **Then** qualquer GIF recebido decorre somente do job e o comando produz apenas sua resposta textual.

---

### User Story 3 - Manter privacidade e elegibilidade (Priority: P3)

Como operador do bot, quero que o countdown e o GIF respeitem as regras atuais de elegibilidade, para não revelar comportamento nem enviar conteúdo a chats não autorizados.

**Why this priority**: Preserva a natureza privada do produto e evita que o novo texto se torne uma forma de interação em chats indevidos.

**Independent Test**: Usar `/itsOver` em chats dentro e fora da allowlist, em diferentes tipos de chat e estados de presença, verificando resposta somente em grupos ou supergrupos elegíveis.

**Acceptance Scenarios**:

1. **Given** um chat fora da allowlist, **When** alguém usa `/itsOver`, **Then** o bot permanece em silêncio, sem countdown e sem GIF.
2. **Given** um chat privado, canal ou outro tipo não elegível, mesmo com o identificador configurado, **When** alguém usa `/itsOver`, **Then** o bot permanece em silêncio.
3. **Given** um grupo allowlisted sem registro anterior de presença ou saída, **When** um membro usa `/itsOver`, **Then** o bot considera a presença de forma otimista e responde com o countdown.
4. **Given** um grupo allowlisted no qual a ausência do bot já foi comprovada, **When** o horário semanal é avaliado, **Then** nenhum envio é tentado para esse grupo.

### Edge Cases

- O instante de referência e o próximo domingo às 18:00 são determinados no fuso nomeado America/Sao_Paulo, independentemente do fuso do servidor ou do usuário.
- X é calculado dividindo a duração positiva restante por uma hora e arredondando para cima; segundos e frações de segundo contam para o arredondamento.
- O próximo horário-alvo é sempre uma ocorrência estritamente posterior ao instante do comando. Assim, no domingo exatamente às 18:00:00, X é 168; durante o restante desse minuto, X também é 168 após arredondamento.
- Uma invocação próxima ao horário semanal pode coexistir com o job: não há deduplicação entre a resposta textual e o GIF automático porque são resultados diferentes, mas o comando nunca solicita ou envia o GIF.
- Alterações futuras de regras civis do fuso devem ser respeitadas pela referência America/Sao_Paulo, sem substituir o fuso por um deslocamento UTC fixo.
- Falha ao enviar a resposta textual não autoriza fallback para GIF.
- Múltiplas invocações de `/itsOver` geram respostas independentes com o X calculado no instante de cada comando.
- Se o serviço estiver offline no horário semanal, o ciclo é perdido; a execução posterior do comando informa o tempo até o domingo seguinte e não recupera o GIF perdido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Em chat elegível, toda invocação de `/itsOver` MUST produzir somente a resposta textual `Ei, calma.. Faltam X horas pro Gif` e MUST NOT enviar o GIF.
- **FR-002**: O sistema MUST definir X como o número inteiro de horas entre o instante do comando e a próxima ocorrência estritamente futura de domingo às 18:00 America/Sao_Paulo, arredondado para cima.
- **FR-003**: O sistema MUST usar America/Sao_Paulo tanto para localizar o próximo horário semanal quanto para calcular X, sem depender do fuso local do usuário ou do ambiente de execução.
- **FR-004**: Se `/itsOver` for usado exatamente no domingo às 18:00:00 America/Sao_Paulo ou durante o mesmo minuto do job, o comando MUST considerar como alvo o domingo seguinte às 18:00 e MUST continuar sem enviar GIF.
- **FR-005**: Somente o job semanal automático MUST iniciar o envio do GIF, aos domingos às 18:00 America/Sao_Paulo.
- **FR-006**: O job semanal MUST enviar o GIF como animation aos chats elegíveis segundo o comportamento atual.
- **FR-007**: O sistema MUST NOT realizar catch-up quando estiver indisponível no horário semanal; o ciclo perdido permanece sem envio.
- **FR-008**: Tanto o countdown quanto o GIF semanal MUST ser limitados a chats elegíveis: identificador na allowlist explícita, tipo grupo ou supergrupo e presença do bot não comprovadamente ausente.
- **FR-009**: Em chats inelegíveis, `/itsOver` MUST manter silêncio útil, sem countdown, GIF ou resposta operacional.
- **FR-010**: Na ausência de evidência de saída, grupos e supergrupos allowlisted MUST continuar elegíveis por presença otimista; eventos de saída ou falhas que comprovem ausência MUST continuar removendo a elegibilidade operacional.
- **FR-011**: A allowlist e os segredos operacionais MUST continuar sendo fornecidos somente pela configuração de ambiente existente; esta funcionalidade MUST NOT introduzir comandos de administração, painel ou segredos versionados.
- **FR-012**: O comando e o job semanal MUST permanecer independentes quando ocorrerem simultaneamente: a resposta do comando é textual e qualquer GIF desse instante só pode ser atribuído ao job.

### Key Entities

- **Ocorrência semanal**: Próximo domingo às 18:00 America/Sao_Paulo estritamente posterior ao comando; serve como destino temporal do countdown.
- **Countdown**: Quantidade inteira X de horas restantes até a ocorrência semanal, arredondada para cima e apresentada na mensagem do comando.
- **Chat elegível**: Grupo ou supergrupo na allowlist explícita em que a presença do bot não foi comprovadamente encerrada.
- **Disparo semanal**: Evento automático autorizado a enviar o GIF no horário definido; não inclui invocações de `/itsOver`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de `/itsOver` em chats elegíveis, o usuário recebe uma única resposta textual com X correto e nenhum GIF é provocado pelo comando.
- **SC-002**: Em 100% dos testes de limite, X corresponde ao arredondamento para cima das horas até o próximo domingo às 18:00 America/Sao_Paulo; exatamente às 18:00 de domingo, X é 168.
- **SC-003**: Em pelo menos 95% das invocações sob condições normais, o countdown aparece no chat em até 5 segundos.
- **SC-004**: Em 100% das ocorrências semanais com o serviço ativo, todos os chats elegíveis recebem o GIF em até 2 minutos após domingo às 18:00 America/Sao_Paulo, sem envios a chats inelegíveis.
- **SC-005**: Em 100% dos testes com chats inelegíveis, `/itsOver` não produz countdown, GIF nem resposta operacional.
- **SC-006**: Em 100% dos testes de indisponibilidade no horário semanal, não ocorre envio de compensação após a retomada do serviço.

## Assumptions

- A expressão solicitada será exibida exatamente como `Ei, calma.. Faltam X horas pro Gif`, mantendo pontuação, capitalização e a palavra “horas” mesmo quando X for 1.
- “Mesmo slot” significa o instante exato e todo o minuto civil de domingo das 18:00:00 às 18:00:59 em America/Sao_Paulo; para o comando, o alvo já é o domingo seguinte durante esse período.
- O horário do comando é suficientemente confiável para calcular o countdown; correção de relógio e operação do ambiente continuam sendo responsabilidades operacionais existentes.
- O job semanal atual, o GIF configurado, as regras de retentativa e o estado persistido permanecem inalterados, exceto pela exclusividade do job como origem de envios do GIF.
- Não há countdown proativo: o texto é enviado somente em resposta a `/itsOver`.
- Não há pluralização especial, exibição de minutos ou segundos, localização para outros idiomas, botão ou edição posterior da mensagem nesta funcionalidade.
