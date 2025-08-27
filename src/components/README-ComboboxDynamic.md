# ComboboxDynamic

Um componente de combobox/autocomplete moderno e acessível para React Hook Form, com funcionalidade de filtragem por digitação em tempo real.

## Características

- ✅ **Filtragem em tempo real**: Digite para filtrar as opções
- ✅ **Integração com React Hook Form**: Usa `useController` para controle automático
- ✅ **Acessibilidade**: Suporte completo a teclado e leitores de tela
- ✅ **Design responsivo**: Funciona bem em dispositivos móveis e desktop
- ✅ **Customizável**: Placeholders, mensagens e estilos personalizáveis
- ✅ **Validação**: Suporte a erros e validação obrigatória
- ✅ **Funcionalidade de limpeza**: Botão para resetar o valor selecionado

## Uso Básico

```tsx
import { ComboboxDynamic } from "./ComboboxDynamic";
import { useForm } from "react-hook-form";

const MyForm = () => {
  const { control } = useForm();
  
  const options = [
    { id: "1", label: "Opção 1" },
    { id: "2", label: "Opção 2" },
    { id: "3", label: "Opção 3" },
  ];

  return (
    <ComboboxDynamic
      name="fieldName"
      control={control}
      label="Meu Campo"
      options={options}
      placeholder="Selecione uma opção"
      required
    />
  );
};
```

## Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `name` | `string` | ✅ | Nome do campo no formulário |
| `control` | `Control<any>` | ✅ | Controle do React Hook Form |
| `options` | `Option[]` | ❌ | Array de opções disponíveis |
| `label` | `string` | ❌ | Rótulo do campo |
| `placeholder` | `string` | ❌ | Texto de placeholder |
| `required` | `boolean` | ❌ | Se o campo é obrigatório |
| `disabled` | `boolean` | ❌ | Se o campo está desabilitado |
| `errors` | `FieldErrors` | ❌ | Erros de validação |
| `onClear` | `() => void` | ❌ | Função chamada ao limpar |
| `onChange` | `(value: string) => void` | ❌ | Função chamada ao alterar |
| `onFocus` | `() => void` | ❌ | Função chamada ao focar |
| `searchPlaceholder` | `string` | ❌ | Placeholder do campo de busca |
| `emptyMessage` | `string` | ❌ | Mensagem quando não há resultados |

## Interface Option

```tsx
interface Option {
  id: string | number;
  label: string;
}
```

## Exemplos de Uso

### Campo de Paciente com Busca

```tsx
<ComboboxDynamic
  name="patientId"
  control={control}
  label="Paciente"
  options={patients.map(p => ({ id: p.id, label: p.name }))}
  placeholder="Selecione o paciente"
  required
  searchPlaceholder="Digite o nome do paciente..."
  emptyMessage="Nenhum paciente encontrado."
  onClear={() => setValue("patientId", "")}
/>
```

### Campo de Método de Pagamento

```tsx
<ComboboxDynamic
  name="paymentMethod"
  control={control}
  label="Método de Pagamento"
  options={[
    { id: "private", label: "Particular" },
    { id: "insurance_unimed", label: "Unimed" },
    { id: "insurance_amil", label: "Amil" },
  ]}
  placeholder="Selecione o método"
  required
  searchPlaceholder="Digite para buscar..."
  emptyMessage="Nenhum método encontrado."
  onChange={(value) => {
    if (value === "private") {
      handlePrivatePayment();
    } else if (value.startsWith("insurance_")) {
      handleInsurancePayment(value.replace("insurance_", ""));
    }
  }}
/>
```

## Funcionalidades de Teclado

- **Tab**: Navega entre campos
- **Enter**: Seleciona a opção destacada
- **Escape**: Fecha o dropdown
- **Setas ↑↓**: Navega pelas opções
- **Digitação**: Filtra as opções em tempo real

## Estilização

O componente usa Tailwind CSS e pode ser customizado através das classes CSS. Ele também se integra com o sistema de temas do projeto.

## Dependências

- React
- React Hook Form
- Lucide React (ícones)
- Tailwind CSS
- Componentes UI do projeto (Button, Command, Popover)

## Migração do SelectDynamic

Para migrar de `SelectDynamic` para `ComboboxDynamic`:

1. Substitua o import:
   ```tsx
   // Antes
   import { SelectDynamic } from "./Selectsn";
   
   // Depois
   import { ComboboxDynamic } from "./ComboboxDynamic";
   ```

2. Substitua o componente:
   ```tsx
   // Antes
   <SelectDynamic
     name="fieldName"
     control={control}
     // ... outras props
   />
   
   // Depois
   <ComboboxDynamic
     name="fieldName"
     control={control}
     // ... outras props
     searchPlaceholder="Digite para buscar..."
     emptyMessage="Nenhuma opção encontrada."
   />
   ```

3. Remova a exibição manual de erros (já incluída no componente)

## Vantagens sobre SelectDynamic

- **Melhor UX**: Usuários podem digitar para encontrar opções rapidamente
- **Acessibilidade**: Melhor suporte a teclado e leitores de tela
- **Design moderno**: Interface mais limpa e intuitiva
- **Performance**: Filtragem em tempo real sem re-renders desnecessários
- **Responsividade**: Funciona melhor em dispositivos móveis
