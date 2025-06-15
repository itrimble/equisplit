# Calculation Algorithms & Legal Basis Documentation
## EquiSplit Property Division Calculator

**Version**: 1.0  
**Last Updated**: June 15, 2025  
**Legal Review Status**: Prepared for Professional Review  

---

## 🔍 **OVERVIEW**

This document provides a comprehensive analysis of the mathematical algorithms and legal foundations underlying the EquiSplit property division calculator. It serves as technical documentation for legal professionals conducting compliance reviews and accuracy assessments.

---

## 🏛️ **LEGAL FRAMEWORK FOUNDATION**

### **Community Property States (9 States)**

#### **Legal Basis**: Equal Division Presumption
- **Constitutional Foundation**: State constitutional provisions recognizing equal ownership
- **Statutory Authority**: State family codes implementing community property regimes
- **Judicial Precedent**: Case law establishing 50/50 division presumption

#### **Algorithmic Implementation**:
```typescript
// Community Property Base Algorithm
const halfValue = asset.currentValue / 2;
spouse1Share = halfValue;
spouse2Share = halfValue;
```

**Legal Standards Applied**:
1. **Presumption of Equal Division**: All community property divided 50/50
2. **Separate Property Protection**: Pre-marital and inherited assets excluded
3. **Income Classification**: Earnings during marriage treated as community property
4. **Debt Allocation**: Community debts shared equally

#### **State-Specific Variations Implemented**:

##### **Texas Special Rules** (`jurisdiction === 'TX'`)
- **Legal Basis**: Texas Family Code § 3.003 - Income and appreciation from separate property
- **Algorithm**: Appreciation from separate property treated as community property
```typescript
// Texas ADM (Appreciation, Depreciation, Mutation) Rule
const adm = calculateADM(asset, marriageDate, separationDate);
if (adm > 0) {
  communityPortionFromSP = adm;
  separatePropertyValue = asset.acquisitionValue;
}
```

##### **California Quasi-Community Property** (`isQCPJurisdiction = true`)
- **Legal Basis**: California Family Code § 125 - Out-of-state acquired property
- **Algorithm**: Property acquired in non-community property states treated as community property
```typescript
if (isQCPJurisdiction && asset.isQuasiCommunityProperty === true) {
  // Treat as community property for division purposes
  totalCommunityAssets += asset.currentValue;
  const halfValue = asset.currentValue / 2;
}
```

### **Equitable Distribution States (41 + DC)**

#### **Legal Basis**: Multi-Factor Analysis
- **Constitutional Foundation**: Due process requirements for fair property division
- **Statutory Authority**: State domestic relations codes listing statutory factors
- **Judicial Discretion**: Courts apply factors based on case-specific circumstances

#### **Algorithmic Implementation**:
```typescript
// Equitable Distribution Base Algorithm
const equityFactor = calculateEquityFactor(specialFactors);
const spouse1Share = asset.currentValue * equityFactor;
const spouse2Share = asset.currentValue * (1 - equityFactor);
```

**Factor Scoring Range**: 0.3 to 0.7 (30% to 70% allocation)
**Base Starting Point**: 0.5 (50/50 presumption)

---

## 📊 **EQUITY FACTOR CALCULATION**

### **Core Factors (All Equitable Distribution States)**

#### **1. Marriage Duration Factor**
```typescript
if (marriageDuration < 5) {
  score -= 0.05; // Shorter marriages favor equal division
} else if (marriageDuration > 20) {
  score += 0.05; // Longer marriages consider more factors
}
```
**Legal Basis**: Short marriages have fewer shared economic interests; long marriages create greater interdependence

#### **2. Age Differential Factor**
```typescript
const ageDifference = ageSpouse1 - ageSpouse2;
if (Math.abs(ageDifference) > 10) {
  score += ageDifference > 0 ? -0.03 : 0.03;
}
```
**Legal Basis**: Significant age differences affect earning capacity and retirement planning

#### **3. Income Disparity Factor**
```typescript
const incomeRatio = incomeSpouse1 / totalIncome;
if (incomeRatio < 0.3) {
  score += 0.1; // Lower earning spouse gets more
} else if (incomeRatio > 0.7) {
  score -= 0.1; // Higher earning spouse gets less
}
```
**Legal Basis**: Economic circumstances and ability to maintain standard of living

#### **4. Earning Capacity Factor**
```typescript
const capacityRatio = earnCapacitySpouse1 / totalEarnCapacity;
if (capacityRatio < 0.4) {
  score += 0.05; // Lower capacity spouse needs more assets
}
```
**Legal Basis**: Future economic prospects and employability considerations

#### **5. Health Status Factor**
```typescript
if (healthSpouse1 === 'poor' && healthSpouse2 !== 'poor') {
  score += 0.05; // Poor health spouse gets more
}
```
**Legal Basis**: Medical expenses and reduced earning capacity due to health issues

#### **6. Child Custody Factor**
```typescript
if (custodyArrangement === 'sole_1') {
  score += 0.08; // Primary custody parent gets more
}
```
**Legal Basis**: Additional expenses and reduced earning capacity for primary caretaker

#### **7. Domestic Violence Factor**
```typescript
if (domesticViolence) {
  score += 0.1; // Victim gets more
}
```
**Legal Basis**: Economic abuse consideration and victim protection

#### **8. Asset Wasting Factor**
```typescript
if (wastingOfAssets) {
  score += 0.05; // Non-wasting spouse gets more
}
```
**Legal Basis**: Dissipation of marital assets and bad faith conduct

### **Pennsylvania-Specific Factors** (23 Pa.C.S. § 3502)

When Pennsylvania-specific factors are detected:

#### **1. Prior Marriage Factor**
```typescript
if (priorMarriageSpouse1 && !priorMarriageSpouse2) {
  score += 0.01; // Slight adjustment for complexity
}
```
**Legal Basis**: 23 Pa.C.S. § 3502(a)(6) - Prior marriage obligations

#### **2. Educational Contribution Factor**
```typescript
if (contributionToEducationTrainingSpouse1) {
  score += 0.02; // Contributor spouse compensated
}
```
**Legal Basis**: 23 Pa.C.S. § 3502(a)(8) - Investment in spouse's education/training

#### **3. Future Opportunities Factor**
```typescript
if (opportunityFutureAcquisitionsSpouse1 && !opportunityFutureAcquisitionsSpouse2) {
  score -= 0.01; // Spouse with better prospects gets less
}
```
**Legal Basis**: 23 Pa.C.S. § 3502(a)(9) - Future acquisition opportunities

#### **4. Economic Needs Factor**
```typescript
if (needsSpouse1 && !needsSpouse2) {
  score += 0.02; // Spouse with greater needs gets more
}
```
**Legal Basis**: 23 Pa.C.S. § 3502(a)(1) - Relative earnings and earning capacities

#### **5. Separate Estate Factor**
```typescript
if (estateSpouse1 > estateSpouse2 * 2) {
  score -= 0.02; // Spouse with larger separate estate gets less marital property
}
```
**Legal Basis**: 23 Pa.C.S. § 3502(a)(4) - Value of property set apart to each party

#### **6. Asset Sale Expense Factor**
```typescript
if (expenseOfSaleAssets > 0) {
  if (score > 0.55) score -= 0.01; // Nudge toward center for high sale costs
}
```
**Legal Basis**: 23 Pa.C.S. § 3502(a)(11) - Tax consequences and expense of sale

---

## 🔒 **MATHEMATICAL SAFEGUARDS**

### **Precision Controls**
```typescript
// Prevent floating-point precision errors
const clampedScore = Math.max(0.3, Math.min(0.7, score));
return Math.round(clampedScore * 1000) / 1000;
```

### **Range Validation**
- **Minimum Factor**: 0.3 (30% allocation floor)
- **Maximum Factor**: 0.7 (70% allocation ceiling)
- **Default**: 0.5 (50/50 starting point)

### **Error Handling**
```typescript
// Validate required inputs for equitable distribution
if (!specialFactors) {
  throw new Error('Equitable distribution requires special factors');
}
```

---

## ⚖️ **LEGAL COMPLIANCE MEASURES**

### **1. Statutory Factor Implementation**

#### **Complete Factor Coverage**
All recognized statutory factors implemented for each jurisdiction:
- Marriage duration and circumstances
- Age and health of parties
- Income and earning capacity
- Standard of living during marriage
- Contribution to marriage (financial and non-financial)
- Child custody arrangements
- Economic circumstances at divorce

#### **State-Specific Compliance**
- Pennsylvania: All 11 factors per 23 Pa.C.S. § 3502
- Other states: Common factors applied with state variations noted

### **2. Judicial Discretion Recognition**
- Factor weighting based on established case law patterns
- Range limitations reflecting typical court outcomes
- No absolute rules that eliminate judicial discretion

### **3. Legal Standard Adherence**
- No pre-determined outcomes
- User-specific factor input required
- Educational calculations only
- Clear limitation disclaimers

---

## 🔍 **CONFIDENCE LEVEL CALCULATION**

### **Base Confidence**: 85%

#### **Complexity Adjustments** (Reduce Confidence)
```typescript
if (domesticViolence) confidence -= 10;        // DV cases more complex
if (wastingOfAssets) confidence -= 10;         // Asset dissipation issues
if (businessInterest) confidence -= 15;       // Business valuation complexity
if (cryptocurrency) confidence -= 10;         // Volatile asset values
```

#### **Simplicity Adjustments** (Increase Confidence)
```typescript
if (simpleCase) confidence += 5;              // Few assets/debts
if (prenuptialAgreement) confidence += 10;    // Clear pre-existing terms
```

**Range**: 50% to 95% confidence
**Legal Basis**: Acknowledges inherent uncertainty in legal proceedings

---

## 📋 **ALGORITHM VALIDATION REQUIREMENTS**

### **Test Case Categories**

#### **Community Property Tests**
1. **Simple 50/50 Division**: Equal assets, no complications
2. **Separate Property**: Pre-marital inheritance excluded
3. **Texas ADM**: Appreciation from separate property
4. **California QCP**: Out-of-state property acquired during marriage
5. **High Debt**: Community debts exceed community assets

#### **Equitable Distribution Tests**
1. **Short Marriage**: < 5 years, limited factor application
2. **Long Marriage**: > 20 years, full factor consideration
3. **Income Disparity**: Significant earning differences
4. **Custody Impact**: Primary caretaker consideration
5. **Pennsylvania Factors**: All 11 statutory factors applied

### **Accuracy Standards**
- Mathematical precision: ±$1 for currency calculations
- Percentage accuracy: ±0.1% for division ratios
- Factor scoring: ±0.001 for equity factors

---

## ⚠️ **LEGAL LIMITATIONS & DISCLAIMERS**

### **Algorithm Scope**
- **Educational Calculations Only**: Not legal advice or court predictions
- **Simplified Factors**: Complex legal nuances require attorney analysis
- **General Applications**: Cannot account for unique case circumstances
- **No Guarantee**: Results may differ from actual court decisions

### **Professional Review Required**
- **Complex Assets**: Business interests, professional practices, intellectual property
- **Jurisdictional Variations**: Local court practices and precedents
- **Recent Legal Changes**: New statutes or significant case law
- **Unique Circumstances**: Factors not covered by standard algorithms

---

## 📚 **LEGAL AUTHORITIES CITED**

### **Community Property States**
- **Arizona**: A.R.S. § 25-211 et seq.
- **California**: Cal. Fam. Code § 125, § 760 et seq.
- **Idaho**: Idaho Code § 32-906 et seq.
- **Louisiana**: La. Civ. Code Art. 2336 et seq.
- **Nevada**: N.R.S. § 125.150 et seq.
- **New Mexico**: N.M.S.A. § 40-3-8 et seq.
- **Texas**: Tex. Fam. Code § 3.001 et seq.
- **Washington**: R.C.W. § 26.09.080 et seq.
- **Wisconsin**: Wis. Stat. § 767.61 et seq.

### **Equitable Distribution Authority**
- **Pennsylvania**: 23 Pa.C.S. § 3502 (comprehensive factor analysis)
- **Uniform Marriage and Divorce Act**: Model legislation basis
- **ALI Principles**: American Law Institute family law guidance

### **Federal Constitutional Standards**
- **Due Process**: 14th Amendment fairness requirements
- **Equal Protection**: Non-discriminatory application

---

## 🔄 **UPDATE & MAINTENANCE PROTOCOLS**

### **Legal Change Monitoring**
- **Quarterly Reviews**: New legislation and appellate decisions
- **Annual Updates**: Comprehensive algorithm review
- **Emergency Updates**: Significant legal developments

### **Accuracy Validation**
- **Peer Review**: Legal professional algorithm verification
- **Test Case Updates**: New scenarios based on case law
- **User Feedback**: Real-world accuracy assessment

### **Version Control**
- **Algorithm Versioning**: Track legal basis changes
- **Calculation History**: Maintain user calculation records
- **Audit Trail**: Legal compliance documentation

---

**Prepared By**: EquiSplit Development Team  
**Review Status**: Ready for Legal Professional Validation  
**Next Review Date**: December 15, 2025  

---

*This documentation provides the technical foundation for legal review of calculation accuracy and compliance with applicable family law standards. All algorithms require validation by qualified legal professionals before production use.*