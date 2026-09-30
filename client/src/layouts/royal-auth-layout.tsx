import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Check, Globe, Sparkles } from "lucide-react";
import { RouteProgressBar } from "@/components/layout/route-progress-bar";

/* The sign-in pages in the Royal design: the form on a white side, and on the
   royal-blue side what SanaD does, a small picture of the dashboard, and two
   notifications floating over it. */
export function RoyalAuthLayout() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const location = useLocation();

  return (
    <div className="ry-auth">
      <RouteProgressBar />
      <section className="ry-lf">
        <div className="ry-brandrow">
          <div className="ry-brand">
            <img src="/brand/sanad-mark.webp" alt="" />
            <div>
              <b>SanaD</b>
              <small>{isAr ? "الموارد البشرية والوثائق" : "People and documents"}</small>
            </div>
          </div>
          <button type="button" className="ry-langbtn" onClick={() => i18n.changeLanguage(isAr ? "en" : "ar")}>
            <Globe /> {isAr ? "English" : "العربية"}
          </button>
        </div>
        <div className="ry-lbody">
          <div key={location.pathname} className="lu-page">
            <Outlet />
          </div>
        </div>
        <div className="ry-lfoot">
          <span>© {new Date().getFullYear()} SanaD HR</span>
          <span>{isAr ? "اتصال مشفّر · بياناتك محمية" : "Encrypted connection · your data is protected"}</span>
        </div>
      </section>
      <section className="ry-la" aria-hidden="true">
        <i className="orb o1" />
        <i className="orb o2" />
        <i className="grid" />
        <div className="ry-copy">
          <span className="ry-kicker">
            <Sparkles /> SanaD HR
          </span>
          <h2>{isAr ? "كل وثائق موظفيك في مكان واحد، وفي وقتها." : "All your people's documents in one place, on time."}</h2>
          <ul>
            <li>
              <Check strokeWidth={3} />
              {isAr ? "تنبيه قبل انتهاء الإقامات والرخص والشهادات" : "A heads-up before iqamas, licences and certificates end"}
            </li>
            <li>
              <Check strokeWidth={3} />
              {isAr ? "مدفوعات الشركة مرتبة حسب الفئة" : "Company payments sorted by category"}
            </li>
            <li>
              <Check strokeWidth={3} />
              {isAr ? "تقارير جاهزة للطباعة بهوية شركتك" : "Print-ready reports with your branding"}
            </li>
          </ul>
        </div>
        <div className="ry-mock">
          <div className="mt">
            <i />
            <i />
            <i />
            <span>{isAr ? "لوحة التحكم" : "Dashboard"}</span>
          </div>
          <div className="mk">
            <div>
              {isAr ? "الموظفون" : "Employees"}
              <b>48</b>
            </div>
            <div>
              {isAr ? "تنتهي قريبًا" : "Ending soon"}
              <b>11</b>
            </div>
            <div>
              {isAr ? "الامتثال" : "Compliance"}
              <b>96%</b>
            </div>
          </div>
          <div className="mc">
            {[42, 58, 50, 72, 64, 80, 70, 92].map((h, k) => (
              <i key={k} style={{ height: `${h}%`, ["--k" as string]: k }} />
            ))}
          </div>
        </div>
        <div className="ry-note n1">
          <span className="ni">
            <Bell />
          </span>
          <div>
            <b>{isAr ? "إقامة تنتهي بعد 11 يومًا" : "An iqama ends in 11 days"}</b>
            {isAr ? "اتبعت تذكير تلقائي للموظف" : "An automatic reminder was sent"}
          </div>
        </div>
        <div className="ry-note n2">
          <span className="ni">
            <Check strokeWidth={2.6} />
          </span>
          <div>
            <b>{isAr ? "اتجددت الرخصة البلدية" : "Municipal licence renewed"}</b>
            {isAr ? "منذ 5 دقائق" : "5 minutes ago"}
          </div>
        </div>
      </section>
    </div>
  );
}
