# Query SQL Corrigida para `/webhook/payments_get`

## Problema
A query atual retorna todos os campos de todas as tabelas (`p.*, a.*, pt.*`), causando conflitos de nomes e formato incorreto.

## Solução
A query deve retornar apenas os campos específicos que o frontend espera, com os nomes corretos.

## Query Corrigida

```sql
SELECT 
    -- Campos do lote de pagamento (payments)
    p.id AS payment_id,
    p.control,
    p.created_at,
    p.pix,
    p.comprovante,
    
    -- Campos do atendimento (appointments)
    a.id AS appointment_id,
    a.date,
    a.value,
    a.insurance_type,
    a.appointment_type,
    a.patient_id,
    a.psychologist_id,
    
    -- Campos do paciente (patients)
    COALESCE(pt.name, pt.nome) AS name,
    
    -- Campos do psicólogo (users)
    u.name AS psychologist_name
    
FROM payments p
JOIN appointments a ON a.payment_id = p.id
JOIN patients pt ON pt.id = a.patient_id
JOIN users u ON u.id = a.psychologist_id
WHERE p.control IN ('payments_created', 'payments_finish')
ORDER BY p.id, a.date;
```

## Campos Esperados pelo Frontend

### Campos do Lote (payments)
- `payment_id` → `p.id`
- `control` → `p.control` (deve ser 'payments_created' ou 'payments_finish')
- `created_at` → `p.created_at`
- `pix` → `p.pix` (pode ser NULL)
- `comprovante` → `p.comprovante` (pode ser NULL)

### Campos do Atendimento (appointments)
- `appointment_id` → `a.id`
- `date` → `a.date`
- `value` → `a.value`
- `insurance_type` → `a.insurance_type`
- `appointment_type` → `a.appointment_type`
- `patient_id` → `a.patient_id`
- `psychologist_id` → `a.psychologist_id`

### Campos do Paciente (patients)
- `name` → `COALESCE(pt.name, pt.nome)` (usa 'name' se existir, senão 'nome')

### Campos do Psicólogo (users)
- `psychologist_name` → `u.name`

## Estrutura da Resposta Esperada

A API deve retornar um array de objetos, onde cada objeto representa um atendimento dentro de um lote:

```json
[
  {
    "payment_id": 16,
    "control": "payments_created",
    "created_at": "2025-11-18T18:16:22.852Z",
    "pix": null,
    "comprovante": null,
    "appointment_id": 101,
    "date": "2025-11-15",
    "value": "57.23",
    "insurance_type": "Particular",
    "appointment_type": "presential",
    "patient_id": "123",
    "psychologist_id": "23",
    "name": "LUCAS ANDRADE DE OLIVEIRA",
    "psychologist_name": "Raquel Nogueira Costa de Almeida"
  },
  {
    "payment_id": 16,
    "control": "payments_created",
    "created_at": "2025-11-18T18:16:22.852Z",
    "pix": null,
    "comprovante": null,
    "appointment_id": 102,
    "date": "2025-11-16",
    "value": "57.23",
    "insurance_type": "Particular",
    "appointment_type": "presential",
    "patient_id": "124",
    "psychologist_id": "23",
    "name": "OUTRO PACIENTE",
    "psychologist_name": "Raquel Nogueira Costa de Almeida"
  }
]
```

## Observações Importantes

1. **Múltiplos registros por lote**: Cada atendimento dentro de um lote deve ser um registro separado. Todos os atendimentos do mesmo lote terão o mesmo `payment_id`.

2. **Agrupamento no frontend**: O frontend agrupa os registros por `payment_id` automaticamente.

3. **Filtro por psicólogo**: O frontend filtra os lotes por `psychologist_id` quando o usuário é um psicólogo.

4. **Valores numéricos**: O campo `value` pode ser retornado como string ou número, o frontend faz `parseFloat()`.

5. **Campos opcionais**: `pix` e `comprovante` podem ser NULL.

## Exemplo de Implementação no Backend

Se estiver usando Node.js/Express:

```javascript
app.get('/webhook/payments_get', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id AS payment_id,
        p.control,
        p.created_at,
        p.pix,
        p.comprovante,
        a.id AS appointment_id,
        a.date,
        a.value,
        a.insurance_type,
        a.appointment_type,
        a.patient_id,
        a.psychologist_id,
        COALESCE(pt.name, pt.nome) AS name,
        u.name AS psychologist_name
      FROM payments p
      JOIN appointments a ON a.payment_id = p.id
      JOIN patients pt ON pt.id = a.patient_id
      JOIN users u ON u.id = a.psychologist_id
      WHERE p.control IN ('payments_created', 'payments_finish')
      ORDER BY p.id, a.date
    `;
    
    const results = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('Erro ao buscar lotes:', error);
    res.status(500).json({ error: 'Erro ao buscar lotes de pagamento' });
  }
});
```

