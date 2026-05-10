import { buildVisibleTree } from './visibleTreeBuilder';
import { buildVisibleTreePedigreeInputFromSettings, compareOldAndVisiblePedigree, } from './visibleTreePedigreeDiff';
const createEmptyClassificationCounts = () => ({
    expected_correction: 0,
    regression: 0,
    undecided_behavior_difference: 0,
});
const createEmptyKindCounts = () => ({
    missing_in_new: 0,
    extra_in_new: 0,
    role_mismatch: 0,
    link_mismatch: 0,
    root_mismatch: 0,
    focus_mismatch: 0,
    generation_mismatch: 0,
    filtered_mismatch: 0,
    repeated_mismatch: 0,
});
const uniqueStrings = (values) => Array.from(new Set(values.filter((value) => Boolean(value))));
const uniqueBooleans = (values) => Array.from(new Set(values));
const uniqueNumbers = (values) => Array.from(new Set(values
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.floor(value)))));
const makeCaseId = (focusPersonId, showDeceased, generationLimit) => `focus=${focusPersonId};showDeceased=${showDeceased};generationLimit=${generationLimit}`;
export const buildVisibleTreePedigreeValidationCases = ({ people, activeFocusPersonId, baseSettings, options, }) => {
    const includeActiveFocus = options?.includeActiveFocus ?? true;
    const requestedFocusPersonIds = uniqueStrings([
        ...(options?.focusPersonIds ?? []),
        ...(includeActiveFocus ? [activeFocusPersonId ?? null] : []),
    ]);
    const validFocusPersonIds = requestedFocusPersonIds.filter((focusPersonId) => people[focusPersonId]);
    const invalidFocusPersonIds = requestedFocusPersonIds.filter((focusPersonId) => !people[focusPersonId]);
    const focusPersonIds = validFocusPersonIds.length > 0 && validFocusPersonIds.some(Boolean)
        ? validFocusPersonIds
        : activeFocusPersonId && people[activeFocusPersonId]
            ? [activeFocusPersonId]
            : [];
    const showDeceasedValues = uniqueBooleans(options?.showDeceasedValues ?? [baseSettings.showDeceased]);
    const generationLimits = uniqueNumbers(options?.generationLimits ?? [baseSettings.generationLimit]);
    const cases = [];
    for (const focusPersonId of focusPersonIds) {
        for (const showDeceased of showDeceasedValues) {
            for (const generationLimit of generationLimits) {
                cases.push({
                    id: makeCaseId(focusPersonId, showDeceased, generationLimit),
                    focusPersonId,
                    showDeceased,
                    generationLimit,
                });
            }
        }
    }
    return { cases, invalidFocusPersonIds };
};
export const isKnownPedigreeDiffIssue = (issue, matcher) => {
    if (matcher.kind && issue.kind !== matcher.kind)
        return false;
    if (matcher.classification && issue.classification !== matcher.classification)
        return false;
    if (matcher.personId && issue.personId !== matcher.personId)
        return false;
    if (matcher.visibleNodeId && issue.visibleNodeId !== matcher.visibleNodeId)
        return false;
    if (matcher.linkKey && issue.linkKey !== matcher.linkKey)
        return false;
    if (matcher.detailsIncludes && !issue.details.includes(matcher.detailsIncludes))
        return false;
    return true;
};
export const classifyVisibleTreePedigreeValidationIssues = (issues, knownExpectedMatchers = []) => {
    const issueCountsByKind = createEmptyKindCounts();
    const classificationCounts = createEmptyClassificationCounts();
    const issueRecords = issues.map((issue) => {
        issueCountsByKind[issue.kind] += 1;
        classificationCounts[issue.classification] += 1;
        const matchedKnownExpectationLabels = knownExpectedMatchers
            .filter((matcher) => isKnownPedigreeDiffIssue(issue, matcher))
            .map((matcher) => matcher.label ?? matcher.detailsIncludes ?? matcher.kind ?? 'known-expected');
        return {
            issue,
            isKnownExpected: matchedKnownExpectationLabels.length > 0,
            matchedKnownExpectationLabels,
        };
    });
    const hasRegression = classificationCounts.regression > 0;
    const hasUndecided = classificationCounts.undecided_behavior_difference > 0;
    const knownExpectedIssueCount = issueRecords.filter((issueRecord) => issueRecord.isKnownExpected).length;
    const unacknowledgedExpectedCorrectionCount = issueRecords.filter((issueRecord) => issueRecord.issue.classification === 'expected_correction' && !issueRecord.isKnownExpected).length;
    let status = 'pass';
    let summary = 'No structural differences detected between the old pedigree snapshot and VisibleTree.';
    if (hasRegression) {
        status = 'fail';
        summary = 'Regression differences detected. Do not enable the VisibleTree pedigree flag for this case.';
    }
    else if (hasUndecided || unacknowledgedExpectedCorrectionCount > 0) {
        status = 'warn';
        summary =
            hasUndecided
                ? 'Undecided behavior differences detected. Review manually before enabling the flag.'
                : 'Only expected corrections were found, but some are not yet recorded as known expectations.';
    }
    return {
        status,
        issueCountsByKind,
        classificationCounts,
        issues: issueRecords,
        knownExpectedIssueCount,
        unacknowledgedExpectedCorrectionCount,
        guidance: {
            acceptable: !hasRegression,
            blocksMigration: hasRegression,
            summary,
        },
    };
};
const buildCaseReport = (people, baseSettings, caseDefinition, knownExpectedMatchers) => {
    const settings = {
        ...baseSettings,
        chartType: 'pedigree',
        showDeceased: caseDefinition.showDeceased,
        generationLimit: caseDefinition.generationLimit,
    };
    const visibleTree = buildVisibleTree('pedigree', buildVisibleTreePedigreeInputFromSettings(people, caseDefinition.focusPersonId, settings));
    const report = compareOldAndVisiblePedigree({
        people,
        focusPersonId: caseDefinition.focusPersonId,
        settings,
    }, visibleTree, { generationLimit: caseDefinition.generationLimit });
    const classification = classifyVisibleTreePedigreeValidationIssues(report.issues, knownExpectedMatchers);
    return {
        caseDefinition,
        status: classification.status,
        report,
        issueCountsByKind: classification.issueCountsByKind,
        classificationCounts: classification.classificationCounts,
        issues: classification.issues,
        knownExpectedIssueCount: classification.knownExpectedIssueCount,
        unacknowledgedExpectedCorrectionCount: classification.unacknowledgedExpectedCorrectionCount,
        guidance: classification.guidance,
    };
};
export const runVisibleTreePedigreeValidation = ({ people, activeFocusPersonId, baseSettings, options, }) => {
    const knownExpectedMatchers = options?.knownExpectedIssues ?? [];
    const { cases, invalidFocusPersonIds } = buildVisibleTreePedigreeValidationCases({
        people,
        activeFocusPersonId,
        baseSettings,
        options,
    });
    const caseResults = cases.map((caseDefinition) => buildCaseReport(people, baseSettings, caseDefinition, knownExpectedMatchers));
    const summary = {
        totalCases: caseResults.length,
        passCount: caseResults.filter((result) => result.status === 'pass').length,
        warnCount: caseResults.filter((result) => result.status === 'warn').length,
        failCount: caseResults.filter((result) => result.status === 'fail').length,
        totalIssues: caseResults.reduce((total, result) => total + result.report.issues.length, 0),
        classificationCounts: caseResults.reduce((acc, result) => ({
            expected_correction: acc.expected_correction + result.classificationCounts.expected_correction,
            regression: acc.regression + result.classificationCounts.regression,
            undecided_behavior_difference: acc.undecided_behavior_difference +
                result.classificationCounts.undecided_behavior_difference,
        }), createEmptyClassificationCounts()),
        knownExpectedIssueCount: caseResults.reduce((total, result) => total + result.knownExpectedIssueCount, 0),
        invalidFocusPersonIds,
    };
    return {
        generatedAt: new Date().toISOString(),
        cases: caseResults,
        summary,
        knownExpectedMatchers,
        guidance: {
            pass: 'Pass means no regressions were found and all expected corrections are either absent or already acknowledged.',
            warn: 'Warn means there are only expected corrections and/or undecided differences. Review before enabling a feature flag.',
            fail: 'Fail means at least one regression was detected. This blocks VisibleTree pedigree rollout for the affected case.',
        },
    };
};
const formatCaseHeader = (caseResult) => [
    `- ${caseResult.caseDefinition.id}`,
    `status=${caseResult.status.toUpperCase()}`,
    `oldNodes=${caseResult.report.oldSnapshot.visibleNodeIds.length}`,
    `newNodes=${caseResult.report.newSnapshot.visibleNodeIds.length}`,
    `oldLinks=${caseResult.report.oldSnapshot.visibleLinks.length}`,
    `newLinks=${caseResult.report.newSnapshot.visibleLinks.length}`,
    `issues=${caseResult.report.issues.length}`,
].join(' | ');
export const formatVisibleTreePedigreeValidationRun = (run) => {
    const lines = [];
    lines.push('[VisibleTree][PedigreeValidation] Summary');
    lines.push(`cases=${run.summary.totalCases} pass=${run.summary.passCount} warn=${run.summary.warnCount} fail=${run.summary.failCount} totalIssues=${run.summary.totalIssues}`);
    lines.push(`classifications expected_correction=${run.summary.classificationCounts.expected_correction} regression=${run.summary.classificationCounts.regression} undecided_behavior_difference=${run.summary.classificationCounts.undecided_behavior_difference}`);
    if (run.summary.invalidFocusPersonIds.length > 0) {
        lines.push(`invalidFocusPersonIds=${run.summary.invalidFocusPersonIds.join(', ')}`);
    }
    if (run.knownExpectedMatchers.length > 0) {
        lines.push(`knownExpectedMatchers=${run.knownExpectedMatchers.length}`);
    }
    for (const caseResult of run.cases) {
        lines.push('');
        lines.push(formatCaseHeader(caseResult));
        lines.push(`  guidance: ${caseResult.guidance.summary}`);
        lines.push(`  classifications: expected_correction=${caseResult.classificationCounts.expected_correction}, regression=${caseResult.classificationCounts.regression}, undecided_behavior_difference=${caseResult.classificationCounts.undecided_behavior_difference}`);
        const nonZeroKinds = Object.entries(caseResult.issueCountsByKind).filter(([, count]) => count > 0);
        if (nonZeroKinds.length > 0) {
            lines.push(`  issueKinds: ${nonZeroKinds.map(([kind, count]) => `${kind}=${count}`).join(', ')}`);
        }
        for (const issueRecord of caseResult.issues) {
            const knownExpectedSuffix = issueRecord.isKnownExpected
                ? ` | knownExpected=${issueRecord.matchedKnownExpectationLabels.join(',')}`
                : '';
            lines.push(`  [${issueRecord.issue.classification}] ${issueRecord.issue.kind}: ${issueRecord.issue.details}${knownExpectedSuffix}`);
        }
    }
    lines.push('');
    lines.push(`pass guidance: ${run.guidance.pass}`);
    lines.push(`warn guidance: ${run.guidance.warn}`);
    lines.push(`fail guidance: ${run.guidance.fail}`);
    return lines.join('\n');
};
export const logVisibleTreePedigreeValidationRun = (run, logger = console) => {
    logger.groupCollapsed(`[VisibleTree][PedigreeValidation] ${run.summary.passCount} pass / ${run.summary.warnCount} warn / ${run.summary.failCount} fail`);
    logger.log(formatVisibleTreePedigreeValidationRun(run));
    logger.groupEnd();
    return run;
};
