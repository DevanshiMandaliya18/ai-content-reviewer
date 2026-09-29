/**
 * Content Review Report Exporter
 * Generates client-side downloadable reports in Markdown, Plain Text, and JSON.
 * Formats output as an official Editorial Audit & Compliance Sign-Off Sheet.
 */

const ReportExporter = {
  /**
   * Triggers a browser file download using Blob and temporary link
   */
  downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Generates a sanitized timestamped filename
   */
  getFilename(extension, prefix = 'editorial-audit-report') {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    return `${prefix}-${dateStr}-${timeStr}.${extension}`;
  },

  /**
   * Export as Formatted Markdown (.md)
   */
  exportMarkdown(reportData, originalText = '') {
    if (!reportData) return;

    const dateStr = new Date().toLocaleString();
    const isPass = reportData.overallStatus === 'Pass';
    const statusEmoji = isPass ? '✅ PASS' : '⚠️ NEEDS REVISION';
    const score = reportData.complianceScore || 0;

    let md = `# ========================================================\n`;
    md += `#        EDITORIAL AUDIT & COMPLIANCE SIGN-OFF SHEET      \n`;
    md += `# ========================================================\n\n`;

    md += `**Audit Date & Time:** ${dateStr}  \n`;
    md += `**Overall Verdict:** ${statusEmoji}  \n`;
    md += `**Compliance Score:** ${score} / 100 (${score >= 90 ? 'Grade A - Publication Ready' : score >= 70 ? 'Grade B - Moderate Revisions Required' : 'Grade C - Critical Revisions Required'})  \n`;
    md += `**Audit Engine:** Google Gemini (${reportData.meta?.modelUsed || 'gemini-2.5-flash'})  \n\n`;

    md += `---\n\n`;
    md += `## 1. Executive Summary\n\n`;
    md += `${reportData.summary}\n\n`;

    md += `## 2. Content & SEO Benchmark Metrics\n\n`;
    md += `| Quality Metric | Guideline Target | Measured Value | Benchmark Status |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    md += `| **Total Word Count** | Informational | ${reportData.metrics?.wordCount || 0} words | ℹ️ TRACKED |\n`;
    md += `| **Hemingway Readability** | ≤ Grade 7 | ${reportData.metrics?.readingLevel || 'Grade 7 or less'} | ✅ AUDITED |\n`;
    md += `| **Primary Keyword** | 2 to 4 natural uses | "${reportData.metrics?.primaryKeyword || 'N/A'}" (${reportData.metrics?.primaryKeywordCount || 0}x) | ${(reportData.metrics?.primaryKeywordCount || 0) >= 2 && (reportData.metrics?.primaryKeywordCount || 0) <= 4 ? '✅ OPTIMAL' : '⚠️ ADJUST DENSITY'} |\n`;
    md += `| **Title Length** | < 58 characters | ${reportData.metrics?.titleLength || 0} chars | ${(reportData.metrics?.titleLength || 0) <= 58 ? '✅ MET' : '⚠️ TOO LONG'} |\n`;
    md += `| **Internal Links** | 2 to 4 relevant links (skip 1st fold) | ${reportData.metrics?.internalLinksCount || 0} links | ${(reportData.metrics?.internalLinksCount || 0) >= 2 && (reportData.metrics?.internalLinksCount || 0) <= 4 ? '✅ MET' : '⚠️ ADJUST LINKS'} |\n`;
    md += `| **Detected Tone** | Expert & Accessible, Anti-AI | ${reportData.metrics?.detectedTone || 'N/A'} | ✅ EVALUATED |\n\n`;

    md += `## 3. Categorized Editorial Findings & Violations (${reportData.violations?.length || 0})\n\n`;
    if (!reportData.violations || reportData.violations.length === 0) {
      md += `*🎉 No guideline violations detected! The article fully conforms to all editorial and SEO rules.*\n\n`;
    } else {
      // Group violations by category
      const categories = ['Tone & Voice', 'Structure & Formatting', 'Compliance & SEO / Links'];
      const grouped = {};
      
      reportData.violations.forEach(v => {
        const cat = v.category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(v);
      });

      Object.keys(grouped).forEach(catName => {
        md += `### Category: ${catName}\n\n`;
        grouped[catName].forEach((v, index) => {
          md += `#### ${index + 1}. [${v.severity?.toUpperCase()}] ${v.issue} (\`${v.ruleId || 'RULE'}\`)\n\n`;
          md += `**Policy Context:** ${v.explanation}\n\n`;
          md += `> **Problematic Excerpt:**  \n> "${v.originalExcerpt}"\n\n`;
          md += `**Actionable Suggested Fix:**\n\`\`\`text\n${v.suggestedFix}\n\`\`\`\n\n`;
        });
      });
    }

    md += `## 4. Rule-by-Rule Compliance Checklist\n\n`;
    md += `| Rule ID | Category | Guideline Description | Status | Auditor Notes |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    (reportData.checklist || []).forEach(c => {
      const statusIcon = c.status === 'Pass' ? '✅ PASS' : c.status === 'Warning' ? '⚠️ WARNING' : '❌ FAIL';
      md += `| \`${c.ruleId}\` | ${c.category} | ${c.ruleName} | ${statusIcon} | ${c.notes} |\n`;
    });
    md += `\n`;

    if (reportData.strengths && reportData.strengths.length > 0) {
      md += `## 5. Editorial Strengths Identified\n\n`;
      reportData.strengths.forEach(s => {
        md += `- ✨ ${s}\n`;
      });
      md += `\n`;
    }

    if (reportData.actionPlan && reportData.actionPlan.length > 0) {
      md += `## 6. Actionable Editorial Remediation Plan\n\n`;
      reportData.actionPlan.forEach((step, idx) => {
        md += `- [ ] **Step ${idx + 1}:** ${step}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
    md += `### Sign-Off & Authorization\n`;
    md += `**Auditor:** AI Editorial Director (Powered by Google Gen AI SDK)  \n`;
    md += `**Status:** ${isPass ? 'APPROVED FOR PUBLISHING' : 'RETURNED FOR REVISION'}  \n`;

    this.downloadBlob(md, this.getFilename('md'), 'text/markdown;charset=utf-8');
  },

  /**
   * Export as Formatted Plain Text (.txt) - Official Editorial Sign-Off Sheet
   */
  exportPlainText(reportData) {
    if (!reportData) return;

    const dateStr = new Date().toLocaleString();
    const score = reportData.complianceScore || 0;
    const isPass = reportData.overallStatus === 'Pass';
    const verdictTitle = isPass ? 'APPROVED — PUBLICATION READY' : 'RETURNED — REVISION REQUIRED';
    const divider = '='.repeat(78);
    const subDivider = '-'.repeat(78);

    let txt = `${divider}\n`;
    txt += `                    EDITORIAL AUDIT & COMPLIANCE SIGN-OFF SHEET\n`;
    txt += `${divider}\n\n`;

    txt += `DOCUMENT METADATA:\n`;
    txt += `${subDivider}\n`;
    txt += `  Audit Timestamp : ${dateStr}\n`;
    txt += `  Audit Engine    : Google Gemini (${reportData.meta?.modelUsed || 'gemini-2.5-flash'})\n`;
    txt += `  Audit Protocol  : Strict 24-Point Editorial & SEO Rulebook\n\n`;

    txt += `OVERALL EDITORIAL VERDICT:\n`;
    txt += `${subDivider}\n`;
    txt += `  Verdict Status  : [ ${reportData.overallStatus.toUpperCase()} ] -> ${verdictTitle}\n`;
    txt += `  Compliance Score: ${score} / 100\n`;
    txt += `  Rating Quality  : ${score >= 90 ? 'Grade A (Exceptional adherence)' : score >= 70 ? 'Grade B (Moderate revisions needed)' : 'Grade C (Critical violations detected)'}\n\n`;

    txt += `EXECUTIVE AUDIT SUMMARY:\n`;
    txt += `${subDivider}\n`;
    txt += `${reportData.summary}\n\n`;

    txt += `CONTENT & SEO BENCHMARK METRICS:\n`;
    txt += `${subDivider}\n`;
    txt += `  * Word Count            : ${reportData.metrics?.wordCount || 0} words\n`;
    txt += `  * Hemingway Readability : ${reportData.metrics?.readingLevel || 'Grade 7 or less'}\n`;
    txt += `  * Primary Keyword       : "${reportData.metrics?.primaryKeyword || 'N/A'}" (${reportData.metrics?.primaryKeywordCount || 0}x - Target: 2-4x)\n`;
    txt += `  * Title Length          : ${reportData.metrics?.titleLength || 0} characters (Target: < 58 chars)\n`;
    txt += `  * Internal Links Count  : ${reportData.metrics?.internalLinksCount || 0} links (Target: 2-4 links, skip 1st fold)\n`;
    txt += `  * Detected Voice/Tone   : ${reportData.metrics?.detectedTone || 'N/A'}\n\n`;

    txt += `${divider}\n`;
    txt += `SECTION 1: CATEGORIZED EDITORIAL VIOLATIONS & REMEDIATION (${reportData.violations?.length || 0} issues)\n`;
    txt += `${divider}\n`;

    if (!reportData.violations || reportData.violations.length === 0) {
      txt += `\n  No violations detected! The submitted draft meets all compliance and SEO rules.\n\n`;
    } else {
      reportData.violations.forEach((v, idx) => {
        txt += `\n[ISSUE #${idx + 1}] [${v.severity?.toUpperCase()}] ${v.issue}\n`;
        txt += `  Category : ${v.category} (Rule Code: ${v.ruleId || 'RULE'})\n`;
        txt += `  Policy   : ${v.explanation}\n`;
        txt += `  Original : "${v.originalExcerpt}"\n`;
        txt += `  Fix/Edit : "${v.suggestedFix}"\n`;
        txt += `  ${subDivider}\n`;
      });
    }

    txt += `\n${divider}\n`;
    txt += `SECTION 2: RULE-BY-RULE COMPLIANCE CHECKLIST (${reportData.checklist?.length || 0} rules audited)\n`;
    txt += `${divider}\n`;

    (reportData.checklist || []).forEach(c => {
      const statusTag = `[${c.status.toUpperCase()}]`.padEnd(11);
      const ruleCode = (c.ruleId || '').padEnd(10);
      txt += `${statusTag} ${ruleCode} | ${c.ruleName}\n`;
      txt += `            Notes: ${c.notes}\n`;
    });

    if (reportData.strengths && reportData.strengths.length > 0) {
      txt += `\n${divider}\n`;
      txt += `SECTION 3: KEY EDITORIAL STRENGTHS IDENTIFIED\n`;
      txt += `${divider}\n`;
      reportData.strengths.forEach(s => {
        txt += `  + ${s}\n`;
      });
    }

    if (reportData.actionPlan && reportData.actionPlan.length > 0) {
      txt += `\n${divider}\n`;
      txt += `SECTION 4: PRIORITIZED REMEDIATION ROADMAP FOR 100% COMPLIANCE\n`;
      txt += `${divider}\n`;
      reportData.actionPlan.forEach((step, idx) => {
        txt += `  [ ] Step ${idx + 1}: ${step}\n`;
      });
    }

    txt += `\n${divider}\n`;
    txt += `OFFICIAL SIGN-OFF & CERTIFICATION:\n`;
    txt += `${subDivider}\n`;
    txt += `  Inspection Result : ${isPass ? 'PASSED — READY FOR PRODUCTION PUBLISHING' : 'FAILED AUDIT — REVISIONS MANDATED'}\n`;
    txt += `  Authorized By     : Stateless AI Content Review Auditor\n`;
    txt += `  Generated Via     : Official Google Gen AI SDK (Gemini 2.5 Flash)\n`;
    txt += `${divider}\n`;

    this.downloadBlob(txt, this.getFilename('txt'), 'text/plain;charset=utf-8');
  },

  /**
   * Export as Raw JSON (.json)
   */
  exportJson(reportData) {
    if (!reportData) return;
    const jsonStr = JSON.stringify(reportData, null, 2);
    this.downloadBlob(jsonStr, this.getFilename('json'), 'application/json;charset=utf-8');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportExporter;
}
