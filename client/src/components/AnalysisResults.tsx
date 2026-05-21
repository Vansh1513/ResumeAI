import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import jsPDF from "jspdf";
import type { JobMatchResult } from "../services/types";
import InterviewQuestions from "./InterviewQuestions";
import KeywordTags from "./KeywordTags";
import ScoreGauge from "./ScoreGauge";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Card from "./ui/Card";

interface AnalysisResultsProps {
  result: JobMatchResult;
}

function InsightList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "success" | "danger" | "default";
}) {
  if (items.length === 0) return null;

  const dot =
    variant === "success" ? "text-success" : variant === "danger" ? "text-danger" : "text-accent";

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li
            key={`${title}-${i}`}
            className="flex gap-3 rounded-lg border border-border-muted bg-surface px-3 py-2.5 text-sm text-text"
          >
            <span className={`mt-0.5 shrink-0 font-bold ${dot}`}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  const isAi = result.analysis_source === "openai";
  const strengths = result.strengths ?? [];
  const weaknesses = result.weaknesses ?? [];
  const suggestions = result.suggestions ?? [];
  const improvedBullets = result.improved_bullets ?? [];

  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!printRef.current || isExporting) return;
    
    // Force React to update the DOM immediately so the expanded UI is ready for capture
    flushSync(() => {
      setIsExporting(true);
    });

    // Brief pause to ensure the browser has painted the expanded layout
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const element = printRef.current;
      const { toJpeg } = await import("html-to-image");

      // html-to-image handles modern CSS (oklab/oklch) perfectly because it uses native browser rendering
      const imgData = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: "#131a24", // Match --color-surface-raised
        pixelRatio: 2, // High resolution
        filter: (node) => {
          // Exclude the download button from the PDF
          if (node.tagName === "BUTTON") {
            const btn = node as HTMLButtonElement;
            return !btn.textContent?.includes("Download PDF");
          }
          return true;
        }
      });
      
      // Calculate PDF dimensions (A4 format)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // We need to calculate height based on the aspect ratio of the DOM element
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;
      const pdfHeight = (elementHeight * pdfWidth) / elementWidth;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ATS_Report_${result.id || "export"}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="space-y-8" ref={printRef}>
      <section className="flex flex-wrap items-start justify-between gap-4">
        <section className="flex-1">
          <section className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={isAi ? "success" : "default"}>
              {isAi ? "✦ AI Analysis" : "Rule-based analysis"}
            </Badge>
            {result.job_title && <span className="text-sm font-semibold text-text-muted">{result.job_title}</span>}
          </section>
          {result.summary && (
            <p className="max-w-2xl text-sm leading-relaxed text-text-muted">{result.summary}</p>
          )}
        </section>
        
        {/* PDF Export Button */}
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="shrink-0 shadow-sm"
        >
          {isExporting ? "Generating PDF..." : "📥 Download PDF"}
        </Button>
      </section>

      <section className="flex flex-wrap justify-center gap-10 rounded-xl bg-surface p-6 shadow-inner">
        <ScoreGauge score={result.match_score} label="Job Match" />
        {result.ats_score != null && <ScoreGauge score={result.ats_score} label="ATS Score" />}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Skills Analysis</h3>
        <KeywordTags matched={result.matched_keywords} missing={result.missing_keywords} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <InsightList title="Strengths" items={strengths} variant="success" />
        <InsightList title="Weaknesses" items={weaknesses} variant="danger" />
      </section>

      <InsightList title="Recommendations" items={suggestions} variant="default" />

      {improvedBullets.length > 0 && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-primary">
            Improved bullet points
          </h3>
          <p className="mb-4 text-xs text-text-muted">
            Copy and adapt these AI-rewritten bullets for your resume.
          </p>
          <ul className="space-y-3">
            {improvedBullets.map((bullet, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm leading-relaxed text-text"
              >
                <span className="mr-2 font-mono text-xs text-primary">{i + 1}.</span>
                {bullet}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.interview_questions && (
        <InterviewQuestions questions={result.interview_questions} isExporting={isExporting} />
      )}
    </Card>
  );
}

