
import Login from "@/components/Login";
import Layout from "@/components/Layout";

const LoginPage = () => {
  return (
    <Layout requireAuth={false}>
      <Login />
    </Layout>
  );
};

export default LoginPage;
