
"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputDynamic } from "./inputDin"; // Ajuste o caminho conforme necessário
import { useAuth } from "@/context/AuthContext";
import { Input } from "./ui/input";

// Schema de validação
const loginSchema = z.object({
  email: z.string().min(1, "Nome de usuário ou e-mail é obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated, isValidating } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Redirecionar se já estiver autenticado (após validação inicial)
  useEffect(() => {
    if (!isValidating && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isValidating, navigate]);

  const formMethods = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = formMethods;

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const success = await login(data.email, data.password);
      if (success) {
        navigate("/");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao fazer login. Verifique sua conexão ou contate o administrador.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'rgb(185, 159, 126)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="mt-4 text-amber-900">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-center min-h-screen py-4 md:py-8 relative w-full h-full"
      style={{ backgroundColor: 'rgb(185, 159, 126)', margin: 0, padding: 0 }}
    >
      {/* Logo do lado esquerdo - escondida em mobile */}
      <div 
        className="hidden md:block absolute top-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none"
        style={{
          left: 'calc(50% - 420px)',
          backgroundImage: `url('/logo-essencia-saude.jpeg')`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>

      {/* Logo do lado direito - escondida em mobile */}
      <div 
        className="hidden md:block absolute top-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none"
        style={{
          right: 'calc(50% - 420px)',
          backgroundImage: `url('/logo-essencia-saude.jpeg')`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>

      <div className="w-full max-w-sm px-4 md:px-4 relative z-10">
        {/* Card do formulário */}
        <Card className="w-full shadow-2xl border-0 bg-white/95 backdrop-blur-md rounded-xl md:rounded-2xl">
            <CardHeader className="space-y-2 md:space-y-3 pb-4 md:pb-6 pt-4 md:pt-6 px-4 md:px-6">
              <CardTitle className="text-xl md:text-2xl font-light text-center text-amber-900 tracking-wide">
                Bem-vindo(a)
              </CardTitle>
              <CardDescription className="text-center text-amber-700/90 text-xs font-medium">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
                <div className="space-y-1.5 md:space-y-2">
                  <label htmlFor="email" className="text-xs md:text-sm font-medium text-amber-900">
                    E-mail
                  </label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Digite seu e-mail"
                    className="h-11 md:h-12 text-sm md:text-base border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-lg transition-all duration-200 bg-white/95"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <div>
                    <label htmlFor="password" className="text-xs md:text-sm font-medium text-amber-900 block mb-1">
                      Senha
                    </label>
                    <InputDynamic
                      name="password"
                      label=""
                      control={control}
                      placeholder="Digite sua senha"
                      type="password"
                      required
                      className="[&_input]:h-11 [&_input]:md:h-12 [&_input]:text-sm [&_input]:md:text-base [&_input]:border-amber-200 [&_input]:focus:border-amber-400 [&_input]:focus:ring-2 [&_input]:focus:ring-amber-400/20 [&_input]:rounded-lg [&_input]:transition-all [&_input]:duration-200 [&_input]:bg-white/95"
                    />
                    {errors.password && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 md:h-11 text-sm md:text-base bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-medium shadow-lg transition-all duration-300 hover:shadow-xl rounded-lg mt-4 md:mt-5" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Entrando...
                    </span>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="pt-3 md:pt-4 pb-4 md:pb-6 px-4 md:px-6">
              <p className="text-[10px] md:text-xs text-center w-full text-amber-600/80 font-medium leading-tight">
                Esqueceu sua senha? Entre em contato com o administrador do sistema.
              </p>
            </CardFooter>
          </Card>
      </div>
    </div>
  );
}
