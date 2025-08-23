
import AppointmentCalendar from "@/components/AppointmentCalendar";
import Layout from "@/components/Layout";

const Index = () => {
  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto">
        <AppointmentCalendar />
      </div>
    </Layout>
  );
};

export default Index;
