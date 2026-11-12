import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#241f16' },
  header: { marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  logo: { width: 80, height: 80, objectFit: 'contain', marginLeft: 16 },
  brand: { fontSize: 10, color: '#957a50', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 11, color: '#6f5a39', marginBottom: 2 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#957a50',
    marginBottom: 6,
    letterSpacing: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#241f16',
    paddingBottom: 5,
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#957a50',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ede3d4',
  },
  cellLabel: { flex: 3, color: '#4c3c24' },
  cellAmount: { flex: 1.3, textAlign: 'right', color: '#4c3c24' },
  totalRow: { flexDirection: 'row', paddingTop: 8, fontWeight: 'bold' },
  netBox: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#957a50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#baa078',
    textAlign: 'center',
  },
})

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface PayStubPDFItem {
  employeeName: string
  payDate: string
  periodStart: string | null
  periodEnd: string | null
  regularHours: number
  overtimeHours: number
  /** Included in `gross`. */
  bonus: number
  gross: number
  federalWithholding: number
  socialSecurityEmployee: number
  medicareEmployee: number
  additionalMedicare: number
  stateWithholding: number
  net: number
  /** Year-to-date totals through this pay date, inclusive. */
  ytd: { gross: number; bonus: number; federal: number; socialSecurity: number; medicare: number; state: number; net: number }
}

export interface PayStubPDFProps {
  businessName: string
  logoUrl?: string | null
  stubs: PayStubPDFItem[]
}

function Line({ label, amount, ytd }: { label: string; amount: number; ytd: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellAmount}>{fmt(amount)}</Text>
      <Text style={styles.cellAmount}>{fmt(ytd)}</Text>
    </View>
  )
}

export function PayStubPDF({ businessName, logoUrl, stubs }: PayStubPDFProps) {
  return (
    <Document title={`Pay stubs - ${businessName}`}>
      {stubs.map((s, i) => {
        const medicare = s.medicareEmployee + s.additionalMedicare
        const hasHours = s.regularHours > 0 || s.overtimeHours > 0
        return (
          <Page key={i} size="LETTER" style={styles.page}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.brand}>Solo Books</Text>
                <Text style={styles.title}>Pay Stub</Text>
                <Text style={styles.subtitle}>{businessName}</Text>
                <Text style={styles.subtitle}>Employee: {s.employeeName}</Text>
                <Text style={styles.subtitle}>Pay date: {s.payDate}</Text>
                {s.periodStart && s.periodEnd && (
                  <Text style={styles.subtitle}>
                    Pay period: {s.periodStart} to {s.periodEnd}
                  </Text>
                )}
              </View>
              {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.cellLabel}>Description</Text>
                <Text style={styles.cellAmount}>This pay</Text>
                <Text style={styles.cellAmount}>Year to date</Text>
              </View>
              <Line
                label={
                  hasHours
                    ? `Regular wages (${s.regularHours} reg hrs${s.overtimeHours > 0 ? `, ${s.overtimeHours} OT hrs` : ''})`
                    : 'Regular wages'
                }
                amount={s.gross - s.bonus}
                ytd={s.ytd.gross - s.ytd.bonus}
              />
              {s.bonus > 0 && <Line label="Bonus" amount={s.bonus} ytd={s.ytd.bonus} />}
              <View style={styles.totalRow}>
                <Text style={styles.cellLabel}>Gross pay</Text>
                <Text style={styles.cellAmount}>{fmt(s.gross)}</Text>
                <Text style={styles.cellAmount}>{fmt(s.ytd.gross)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Taxes withheld</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.cellLabel}>Description</Text>
                <Text style={styles.cellAmount}>This pay</Text>
                <Text style={styles.cellAmount}>Year to date</Text>
              </View>
              <Line label="Federal income tax" amount={s.federalWithholding} ytd={s.ytd.federal} />
              <Line label="Social Security" amount={s.socialSecurityEmployee} ytd={s.ytd.socialSecurity} />
              <Line label="Medicare" amount={medicare} ytd={s.ytd.medicare} />
              <Line label="Oklahoma income tax" amount={s.stateWithholding} ytd={s.ytd.state} />
            </View>

            <View style={styles.netBox}>
              <Text>Net pay</Text>
              <Text>{fmt(s.net)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: '#6f5a39' }}>Year-to-date net pay</Text>
              <Text style={{ color: '#6f5a39' }}>{fmt(s.ytd.net)}</Text>
            </View>

            <Text style={styles.footer} fixed>
              Generated {new Date().toLocaleString()} · Solo Books
            </Text>
          </Page>
        )
      })}
    </Document>
  )
}
