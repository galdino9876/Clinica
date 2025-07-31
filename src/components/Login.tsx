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
  email: z.string().min(1, "Nome de usuário ou e-mail é obrigatório").email("E-mail inválido"),
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

      if (response.status === 200) {
        // Login bem-sucedido, redireciona para a página principal
        navigate("/index"); // Ajuste o caminho conforme necessário
      } else {
        // Login falhou
        const errorData = await response.json();
        alert(`Erro ao fazer login: ${errorData.message || "Credenciais inválidas"}`);
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao fazer login. Verifique sua conexão ou contate o administrador.");
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
                label="E-mail"
                control={control}
                placeholder="Digite seu e-mail"
                required
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
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
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
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
