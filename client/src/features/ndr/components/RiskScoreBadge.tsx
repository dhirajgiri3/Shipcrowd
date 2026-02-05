
import { Badge } from '@/src/components/ui/core/Badge';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';

interface RiskScoreBadgeProps {
    score?: number;
    showTooltip?: boolean;
}

export const RiskScoreBadge = ({ score, showTooltip = true }: RiskScoreBadgeProps) => {
    if (score === undefined || score === null) return <Badge variant="neutral">N/A</Badge>;

    // Scoring: 
    // 0-25: Low Risk (Safe)
    // 26-50: Medium Risk
    // 51-75: High Risk
    // 76-100: Critical Risk (Block)

    const variant = score >= 75 ? 'error' :
        score >= 50 ? 'warning' :
            score >= 25 ? 'info' : 'success';

    const label = score >= 75 ? 'Critical' :
        score >= 50 ? 'High' :
            score >= 25 ? 'Medium' : 'Low';

    const badge = <Badge variant={variant}>{label} ({score})</Badge>;

    if (!showTooltip) return badge;

    return (
        <Tooltip content={`Risk Score: ${score}/100`} side="top">
            {badge}
        </Tooltip>
    );
};
