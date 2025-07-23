"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputDynamic } from "./inputDin"; // Ajuste o caminho conforme necessário

// Schema de validação
const loginSchema = z.object({
  email: z.string().min(1, "Nome de usuário ou e-mail é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const formMethods = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = formMethods;

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("https://webhook.essenciasaudeintegrada.com.br/webhook/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Captura o texto da resposta para depuração
        throw new Error(`Falha no login: ${response.status} - ${errorText || "Sem detalhes"}`);
      }

      const responseText = await response.text();
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error("Resposta da API não é um JSON válido");
      }

      if (result.success) {
        navigate("/");
      } else {
        throw new Error("Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao fazer login. Verifique suas credenciais ou contate o administrador. Detalhes: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Clínica Psicológica</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <InputDynamic
                name="email"
                label="Nome de usuário ou E-mail"
                control={control}
                placeholder="Digite seu e-mail"
                required
              />
            </div>
            <div className="space-y-2">
              <InputDynamic
                name="password"
                label="Senha"
                control={control}
                placeholder="Digite sua senha"
                type="password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-center w-full text-gray-500">
            Esqueceu sua senha? Entre em contato com o administrador do sistema.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
