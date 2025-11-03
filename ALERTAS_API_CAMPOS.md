# Campos Obrigatórios para API de Alertas

## Estrutura de Dados Mínima Necessária

### Nível Raiz (por paciente/alert)

#### ✅ Campos OBRIGATÓRIOS:

1. **`paciente_nome`** (string)
   - Usado para: Exibir o nome do paciente na lista
   - Exemplo: `"ANA CLARA VIANA DE ASSUNÇÃO"`
   - Localização no código: Linha 453, 275, 283

2. **`exibir`** (number | string)
   - Usado para: Controlar se o alerta está ativo (1) ou desabilitado (0)
   - Valores aceitos: `1` ou `"1"` (ativo), `0` ou `"0"` (desabilitado)
   - Localização no código: Linhas 404, 409, 444, 276

3. **`datas`** (Array)
   - Usado para: Listar todas as datas com status de agendamento e guia
   - Deve ser um array (pode ser vazio `[]`)
   - Localização no código: Linhas 414, 468, múltiplos usos

#### ⚪ Campos OPCIONAIS:

4. **`patient_id`** (number | undefined)
   - Usado para: Identificar o paciente ao salvar alterações (se não fornecido, busca pelo nome)
   - Localização no código: Linhas 281-293
   - Recomendação: Incluir se possível para evitar busca adicional

5. **`motivo`** (string | null)
   - Usado para: Exibir motivo quando paciente desistiu (quando `exibir = 0`)
   - Localização no código: Linhas 457-459, 236, 277
   - Recomendação: Incluir quando `exibir = 0`

---

### Dentro do Array `datas` (por data)

#### ✅ Campos OBRIGATÓRIOS dentro de cada objeto do array `datas`:

1. **`data`** (string)
   - Formato: `"DD/MM/YYYY"` (ex: `"03/11/2025"`)
   - Usado para: Exibir a data e calcular dia da semana para agrupamento
   - Localização no código: Linhas 482, 525, 500-506

2. **`agendamento`** (string)
   - Valores aceitos: `"ok"`, `"falta"`, `"warning"`, `"error"`, ou outros
   - Usado para: Exibir status do agendamento (exibe "falta agendamento" se for "falta")
   - Localização no código: Linhas 512-515, 530

3. **`guia`** (string)
   - Valores aceitos: `"ok"`, `"falta"`, ou outros
   - Usado para: Exibir status da guia (exibe "falta guia" se for "falta")
   - Localização no código: Linhas 518-520, 419, 533

#### ⚪ Campos OPCIONAIS dentro do array `datas`:

4. **`numero_prestador`** (number | string | null)
   - Usado para: Armazenado mas não exibido diretamente na interface atual
   - Localização no código: Apenas na definição do tipo (linha 21)
   - Recomendação: Pode ser omitido se não for necessário para lógica futura

---

## Exemplo de Estrutura Mínima da API

```json
[
  {
    "paciente_nome": "ANA CLARA VIANA DE ASSUNÇÃO",
    "exibir": 1,
    "datas": [
      {
        "data": "03/11/2025",
        "agendamento": "ok",
        "guia": "falta"
      },
      {
        "data": "10/11/2025",
        "agendamento": "ok",
        "guia": "falta"
      }
    ]
  },
  {
    "paciente_nome": "MARCELA GOMES MIGUEL",
    "exibir": 0,
    "motivo": "Paciente solicitou cancelamento",
    "datas": [
      {
        "data": "03/11/2025",
        "agendamento": "falta",
        "guia": "falta"
      }
    ]
  }
]
```

## Exemplo de Estrutura Completa (Recomendada)

```json
[
  {
    "paciente_nome": "ANA CLARA VIANA DE ASSUNÇÃO",
    "patient_id": 123,
    "exibir": 1,
    "motivo": null,
    "datas": [
      {
        "data": "03/11/2025",
        "agendamento": "ok",
        "guia": "falta",
        "numero_prestador": null
      }
    ]
  }
]
```

---

## Campos que PODEM ser REMOVIDOS da API:

- Qualquer campo que não esteja listado acima
- Campos de timestamps não utilizados
- Campos de IDs internos do banco de dados não referenciados
- Campos de metadados ou auditoria
- Campos duplicados ou redundantes

---

## Resumo Visual

```
AlertWebhookItem {
  ✅ paciente_nome: string         (OBRIGATÓRIO)
  ⚪ patient_id?: number           (OPCIONAL - mas recomendado)
  ⚪ motivo?: string | null        (OPCIONAL - mas recomendado quando exibir=0)
  ✅ exibir: number | string       (OBRIGATÓRIO)
  ✅ datas: Array<{                (OBRIGATÓRIO - pode ser array vazio)
    ✅ data: string                (OBRIGATÓRIO - formato "DD/MM/YYYY")
    ✅ agendamento: string         (OBRIGATÓRIO)
    ✅ guia: string                (OBRIGATÓRIO)
    ⚪ numero_prestador?: ...      (OPCIONAL)
  }>
}
```

---

## Observações Importantes:

1. O campo `datas` **DEVE** ser um array, mesmo que vazio (`[]`)
2. O formato da data **DEVE** ser `"DD/MM/YYYY"` (não aceita `"YYYY-MM-DD"`)
3. O campo `exibir` aceita tanto `number` (1, 0) quanto `string` ("1", "0")
4. O array `datas` é filtrado para mostrar apenas datas futuras (de hoje em diante)
5. Se `datas` for `null` ou `undefined`, o código trata como se não houvesse datas

