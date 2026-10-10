import { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '../components/layout/Header';
import { payrollApi } from '../utils/api';
import { POSITION_LABELS, INCENTIVE_LABELS, DEDUCTION_LABELS, type PositionType } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import logoImage from '../../images/logo.png';

export default function Payslip() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: payroll, isLoading } = useQuery({
    queryKey: ['payroll', id],
    queryFn: () => payrollApi.getById(parseInt(id!)).then((res) => res.data),
    enabled: !!id,
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payslip-${payroll?.employee?.name}-${formatDate(payroll?.startDate || '', 'MMM-dd-yyyy')}`,
  });

  if (isLoading || !payroll) return null;

  const employee = payroll.employee;
  const branch = employee?.branch;

  // Calculate late deduction: Rate/Hour × (Late Minutes / 60)
  const lateDeduction = employee?.ratePerHour && payroll.lateMinutes > 0
    ? employee.ratePerHour * (payroll.lateMinutes / 60)
    : 0;

  // Combine regular deductions with late deduction for display
  const allDeductions = [
    ...(payroll.deductions || []),
    ...(lateDeduction > 0 ? [{
      id: -1, // Temporary ID for late deduction
      type: 'LATE',
      amount: lateDeduction,
      payrollId: payroll.id,
    }] : [])
  ];

  // Helper to ensure a section has at least 8 rows for consistent height
  const padRows = (arr: any[] = [], minRows = 8) => {
    const padded = [...arr];
    while (padded.length < minRows) padded.push(null);
    return padded;
  };

  return (
    <>
      <Header title="Payslip" subtitle={employee?.name} />

      <div className="p-6 print:p-0">
        <div className="flex items-center justify-between mb-6 no-print">
          <Link to="/payroll" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to Payroll
          </Link>
          <Button onClick={() => handlePrint()}>
            <Printer className="h-5 w-5" /> Print Payslip
          </Button>
        </div>

        {/* Payslip Document */}
        <div ref={printRef} className="print:w-full print:bg-white flex justify-center py-4">
          <div className="bg-white p-4 shadow-sm border border-gray-300 print:scale-[0.74]" style={{ width: '1100px', fontFamily: 'sans-serif' }}>
            
            {/* 1. Header Section */}
            <div className="flex border border-black border-b-0">
              <div className="w-1/2 p-2 flex items-center gap-4 border-r border-black">
                <div className="w-16 h-16 border border-green-700 rounded-full flex items-center justify-center p-1">
                <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold uppercase leading-tight">Pet Hub Veterinary Clinic</h1>
                  <p className="text-[10px]">{branch?.address || 'Lot 7A Pandan Road, Mining, Angeles City, Pampanga 2009'}</p>
                  <p className="text-[10px]">{branch?.contact || '0917-129-1740'}</p>
                </div>
              </div>
              <div className="w-1/2 p-2 text-right flex flex-col justify-center">
                <h2 className="font-bold text-sm uppercase">
                  {formatDate(payroll.startDate, 'MMM dd')} - {formatDate(payroll.endDate, 'MMM dd, yyyy')}
                </h2>
                <p className="text-xs font-bold">Regular Payroll ({new Date(payroll.startDate).getFullYear()})</p>
                <p className="text-[10px]">Veterinary Services</p>
              </div>
            </div>

            {/* 2. Employee Info Table */}
            <table className="w-full border-collapse border border-black text-[11px]">
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold w-16 bg-[#f2f2f2]">Name:</td>
                  <td className="border border-black px-2 py-0.5 font-bold uppercase" colSpan={3}>{employee?.name}</td>
                  <td className="border border-black px-2 py-0.5 font-bold w-20 bg-[#f2f2f2]">Address:</td>
                  <td className="border border-black px-2 py-0.5" colSpan={5}>{employee?.address || '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">Position:</td>
                  <td className="border border-black px-2 py-0.5 font-bold" colSpan={3}>{POSITION_LABELS[(employee?.position || 'STAFF') as PositionType]}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">SSS:</td>
                  <td className="border border-black px-2 py-0.5">{employee?.sssNo || '-'}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">Tin:</td>
                  <td className="border border-black px-2 py-0.5">{employee?.tinNo || '-'}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">PHIC:</td>
                  <td className="border border-black px-2 py-0.5">{employee?.philhealthNo || '-'}</td>
                </tr>
                <tr className="text-center">
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">Salary:</td>
                  <td className="border border-black px-2 py-0.5">{formatCurrency(employee?.salary || 0)}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">Daily Rate:</td>
                  <td className="border border-black px-2 py-0.5">{formatCurrency(employee?.ratePerDay || 0)}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">Rate/Hour:</td>
                  <td className="border border-black px-2 py-0.5">{formatCurrency(employee?.ratePerHour || 0)}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">Hired on:</td>
                  <td className="border border-black px-2 py-0.5" colSpan={1}>{employee?.hiredOn ? formatDate(employee.hiredOn, 'MMM dd, yyyy') : '-'}</td>
                  <td className="border border-black px-2 py-0.5 font-bold bg-[#f2f2f2]">HDMF:</td>
                  <td className="border border-black px-2 py-0.5">{employee?.pagibigNo || '-'}</td>
                </tr>
              </tbody>
            </table>

            {/* 3. Main Data Grid */}
            <div className="flex border-x border-b border-black text-[10px]">
              {/* INCOME */}
              <div className="w-1/5 border-r border-black">
                <div className="bg-[#e0e0e0] font-bold text-center border-b border-black py-0.5">INCOME</div>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="px-1 py-1 font-bold">BASIC PAY:</td>
                      <td className="px-1 py-1 text-right">{formatCurrency(payroll.basicPay)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="px-1 py-1 font-bold">OVERTIME:</td>
                      <td className="px-1 py-1 text-right">{formatCurrency(payroll.overtimePay)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="px-1 py-1 font-bold">HOLIDAYS:</td>
                      <td className="px-1 py-1 text-right">{formatCurrency(payroll.holidayPay)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="px-1 py-1 font-bold">TOTAL INCENTIVES:</td>
                      <td className="px-1 py-1 text-right">{formatCurrency(payroll.totalIncentives)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="px-1 py-1 font-bold uppercase">Meal Allowance:</td>
                      <td className="px-1 py-1 text-right">{formatCurrency(payroll.mealAllowance || 0)}</td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="px-1 py-1 font-bold uppercase">SIL:</td>
                      <td className="px-1 py-1 text-right">{payroll.silPay > 0 ? formatCurrency(payroll.silPay) : ''}</td>
                    </tr>
                    <tr>
                      <td className="px-1 py-1 font-bold uppercase">Birthday Leave:</td>
                      <td className="px-1 py-1 text-right">{payroll.birthdayLeave > 0 ? formatCurrency(payroll.birthdayLeave) : ''}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* DAYS OF WORK */}
              <div className="w-1/5 border-r border-black">
                <div className="bg-[#e0e0e0] font-bold text-center border-b border-black py-0.5">DAYS OF WORK</div>
                <table className="w-full border-collapse">
                  <tbody>
                    {[['WORKING DAYS:', payroll.workingDays], ['REST DAY:', payroll.dayOff], ['ABSENT:', payroll.absences], ['TOTAL WORKING DAYS:', payroll.totalDaysPresent]].map(([label, val], idx) => (
                      <tr key={idx} className="border-b border-black last:border-0">
                        <td className="px-1 py-1 font-bold">{label}</td>
                        <td className="px-1 py-1 text-right font-bold">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* INCENTIVES */}
              <div className="w-1/5 border-r border-black">
                <div className="bg-[#e0e0e0] font-bold text-center border-b border-black py-0.5">INCENTIVES</div>
                <table className="w-full border-collapse">
                  <tbody>
                    {padRows(payroll.incentives).map((inc, idx) => (
                      <tr key={idx} className="border-b border-black last:border-0 h-5">
                        <td className="px-1 uppercase font-bold text-[9px]">{inc ? (INCENTIVE_LABELS[inc.type] || inc.type) : ''}</td>
                        <td className="px-1 text-right">{inc ? formatCurrency(inc.amount) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DEDUCTIONS */}
              <div className="w-1/5 border-r border-black">
                <div className="bg-[#e0e0e0] font-bold text-center border-b border-black py-0.5">DEDUCTIONS</div>
                <table className="w-full border-collapse">
                  <tbody>
                    {padRows(allDeductions).map((ded, idx) => (
                      <tr key={idx} className="border-b border-black last:border-0 h-5">
                        <td className="px-1 uppercase font-bold text-[9px]">{ded ? (DEDUCTION_LABELS[ded.type] || ded.type) : ''}</td>
                        <td className="px-1 text-right">{ded ? formatCurrency(ded.amount) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SUMMARY */}
              <div className="w-1/5 flex flex-col">
                <div className="bg-[#e0e0e0] font-bold text-center border-b border-black py-0.5">SUMMARY</div>
                <div className="flex-1">
                   <div className="flex justify-between p-1 border-b border-black h-1/3 items-center">
                      <span className="font-bold uppercase">Gross Pay:</span>
                      <span className="font-bold">{formatCurrency(payroll.grossPay)}</span>
                   </div>
                   <div className="flex justify-between p-1 border-b border-black h-1/3 items-center">
                      <span className="font-bold uppercase">Deductions:</span>
                      <span className="font-bold">{formatCurrency(payroll.totalDeductions + lateDeduction)}</span>
                   </div>
                   <div className="bg-[#d9e9f3] flex flex-col items-center justify-center h-1/3 p-1">
                      <span className="font-bold text-xs uppercase">Net Pay:</span>
                      <span className="text-xl font-black">{formatCurrency(payroll.netPay)}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* 4. Footer / Signatures */}
            <div className="mt-8 grid grid-cols-3 gap-8 px-4">
              <div className="text-center">
                <p className="text-[10px] italic">Prepared by:</p>
                <div className="mt-8 border-b border-black mx-4"></div>
                <p className="font-bold text-xs mt-1">Princess Kyla Rosario</p>
                <p className="text-[10px]">Accounting Officer</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] italic">Noted and Approved by:</p>
                <div className="mt-8 border-b border-black mx-4"></div>
                <p className="font-bold text-xs mt-1">Jeremiah L. Munoz, DVM</p>
                <p className="text-[10px]">Operations Manager</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] italic">Conforme:</p>
                <div className="mt-8 border-b border-black mx-4"></div>
                <p className="font-bold text-xs mt-1 uppercase">{employee?.name}</p>
                <p className="text-[10px]">Employee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}