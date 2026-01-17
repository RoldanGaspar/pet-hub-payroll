import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import CashAdvances from './pages/CashAdvances';
import Payslip from './pages/Payslip';
import Payslips from './pages/Payslips';
import IncentiveConfig from './pages/IncentiveConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="branches" element={<Branches />} />
              <Route path="employees" element={<Employees />} />
              <Route path="payroll" element={<Payroll />} />
              <Route path="cash-advances" element={<CashAdvances />} />
              <Route path="payslips" element={<Payslips />} />
              <Route path="payslips/:id" element={<Payslip />} />
              <Route path="incentive-config" element={<IncentiveConfig />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
