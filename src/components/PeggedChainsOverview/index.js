import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { OptionButton } from 'components/ButtonStyled'
import { AutoColumn } from '../Column'
import { RowBetween, AutoRow } from 'components/Row'
import Search from 'components/Search'
import PeggedViewSwitch from 'components/PeggedViewSwitch'
import {
  getRandomColor,
  capitalizeFirstLetter,
  formattedNum,
  formattedPercent,
  getPercentChange,
  getPeggedDominance,
  toNiceMonthlyDate,
} from 'utils'
import { useCalcCirculating, useCalcGroupExtraPeggedByDay, useGroupChainsPegged } from 'hooks/data'
import { useLg, useXl, useMed } from 'hooks/useBreakpoints'
import { TYPE } from 'Theme'
import { columnsToShow, isOfTypePeggedCategory, NamePegged, FullTable } from 'components/Table'
import { PeggedChainResponsivePie, PeggedChainResponsiveDominance } from 'components/Charts'
import { useDarkModeManager } from 'contexts/LocalStorage'
import { GeneralAreaChart } from 'components/TokenChart'
import { BreakpointPanels, BreakpointPanelsColumn, Panel } from 'components'
import { PeggedAssetGroupOptions } from 'components/Select'

function Chart({ formattedPeggedChainAreaChart, formattedPeggedMcapAreaChart, totalMcapLabel, chainList, aspect }) {
  const [darkMode] = useDarkModeManager()
  const textColor = darkMode ? 'white' : 'black'
  const finalChartData = formattedPeggedChainAreaChart ? formattedPeggedChainAreaChart : formattedPeggedMcapAreaChart
  const labels = chainList ? chainList : totalMcapLabel
  return (
    <GeneralAreaChart
      aspect={aspect}
      finalChartData={finalChartData}
      tokensUnique={labels}
      textColor={textColor}
      color={'blue'}
      moneySymbol="$"
      formatDate={toNiceMonthlyDate}
      hallmarks={[]}
    />
  )
}

const AssetFilters = styled.div`
  margin: 12px 0 16px;
  & > h2 {
    margin: 0 2px 8px;
    font-weight: 600;
    font-size: 0.825rem;
    color: ${({ theme }) => theme.text1};
  }
`

const StyledTable = styled(FullTable)`
  tr > :first-child {
    padding-left: 40px;
  }
`

function PeggedChainsOverview({
  title,
  category,
  chainCirculatings,
  chartData,
  formattedPeggedChainAreaChart,
  formattedPeggedMcapAreaChart,
  stackedDataset,
  peggedChartType,
  defaultSortingColumn,
  chainList,
  chainsGroupbyParent,
}) {
  let firstColumn = columnsToShow('protocolName')[0]

  const peggedColumn = `${category}`
  if (isOfTypePeggedCategory(peggedColumn)) {
    firstColumn = {
      header: 'Name',
      accessor: 'name',
      disableSortBy: true,
      Cell: ({ value, rowValues, rowIndex = null, rowType, showRows }) => (
        <NamePegged
          type="peggedUSD"
          value={value}
          symbol={rowValues.symbol}
          index={rowType === 'child' ? '-' : rowIndex !== null && rowIndex + 1}
          rowType={rowType}
          showRows={showRows}
        />
      ),
    }
  }

  const columns = [
    firstColumn,
    {
      header: 'Dominant Stablecoin',
      accessor: 'dominance',
      disableSortBy: true,
      Cell: ({ value }) => {
        return (
          <>
            {value && (
              <AutoRow sx={{ width: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                <span>{`${value.name}: `}</span>
                <span>{formattedPercent(value.value, true)}</span>
              </AutoRow>
            )}
          </>
        )
      },
    },
    {
      header: 'Total Mcap Issued On',
      accessor: 'minted',
      Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
    },
    {
      header: 'Total Mcap Bridged To',
      accessor: 'bridgedTo',
      Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
    },
    ...columnsToShow('7dChange'),
    {
      header: 'Market Cap',
      accessor: 'mcap',
      Cell: ({ value }) => <>{value && formattedNum(value, true)}</>,
    },
    {
      header: 'Mcap/TVL',
      accessor: 'mcaptvl',
      Cell: ({ value }) => <>{value && formattedNum(value, false)}</>,
    },
  ]

  const [chartType, setChartType] = useState(peggedChartType)

  const belowMed = useMed()
  const belowLg = useLg()
  const belowXl = useXl()
  const aspect = belowXl ? (belowMed ? 1 : 60 / 42) : 60 / 22

  const filteredPeggedAssets = chainCirculatings
  const chainTotals = useCalcCirculating(filteredPeggedAssets, defaultSortingColumn)

  const chainsCirculatingValues = useMemo(() => {
    const data = chainTotals.map((chain) => ({ name: chain.name, value: chain.mcap }))

    const otherCirculating = data.slice(10).reduce((total, entry) => {
      return (total += entry.value)
    }, 0)

    return data
      .slice(0, 10)
      .sort((a, b) => b.value - a.value)
      .concat({ name: 'Others', value: otherCirculating })
  }, [chainTotals])

  const chainColor = useMemo(
    () => Object.fromEntries([...chainTotals, 'Others'].map((chain) => [chain.name, getRandomColor()])),
    [chainTotals]
  )

  const { data: stackedData, daySum } = useCalcGroupExtraPeggedByDay(stackedDataset)

  if (!title) {
    title = `Market Cap`
    if (category) {
      title = `${capitalizeFirstLetter(category)} Market Cap`
    }
  }

  const { percentChange, totalMcapCurrent } = useMemo(() => {
    const chartCurrent = chartData[chartData.length - 1] ?? null
    const chartPrevDay = chartData[chartData.length - 2] ?? null
    const totalMcapCurrent = chartCurrent?.mcap
    const totalMcapPrevDay = chartPrevDay?.mcap
    const percentChange = getPercentChange(totalMcapCurrent, totalMcapPrevDay)?.toFixed(2)
    return { percentChange, totalMcapCurrent }
  }, [chartData])

  const mcapToDisplay = formattedNum(totalMcapCurrent, true)

  let topChain = { name: 'Ethereum', mcap: 0 }
  if (chainTotals.length > 0) {
    const topChainData = chainTotals[0]
    topChain.name = topChainData.name
    topChain.mcap = topChainData.mcap
  }

  const dominance = getPeggedDominance(topChain, totalMcapCurrent)

  const totalMcapLabel = ['Total Stablecoins Market Cap']

  const groupedChains = useGroupChainsPegged(chainTotals, chainsGroupbyParent)

  const panels = (
    <>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Total {title}</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
              {mcapToDisplay}
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>Change (24h)</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
              {percentChange || 0}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
      <Panel style={{ padding: '18px 25px', justifyContent: 'center' }}>
        <AutoColumn gap="4px">
          <RowBetween>
            <TYPE.heading>{topChain.name} Dominance</TYPE.heading>
          </RowBetween>
          <RowBetween style={{ marginTop: '4px', marginBottom: '-6px' }} align="flex-end">
            <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
              {dominance}%
            </TYPE.main>
          </RowBetween>
        </AutoColumn>
      </Panel>
    </>
  )

  return (
    <>
      <RowBetween>
        <TYPE.largeHeader>{title}</TYPE.largeHeader>
        <Search small={!belowLg} />
      </RowBetween>
      <AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
        <PeggedViewSwitch />
      </AutoRow>
      <div>
        <BreakpointPanels>
          <BreakpointPanelsColumn gap="10px">{panels}</BreakpointPanelsColumn>
          <Panel style={{ height: '100%', minHeight: '347px', flex: 1, maxWidth: '100%' }}>
            <RowBetween mb={useMed ? 40 : 0} align="flex-start">
              <AutoRow style={{ width: 'fit-content' }} justify="flex-end" gap="6px" align="flex-start">
                <OptionButton active={chartType === 'Mcap'} onClick={() => setChartType('Mcap')}>
                  Total Mcap
                </OptionButton>
                <OptionButton active={chartType === 'Area'} onClick={() => setChartType('Area')}>
                  Area
                </OptionButton>
                <OptionButton active={chartType === 'Dominance'} onClick={() => setChartType('Dominance')}>
                  Dominance
                </OptionButton>
                <OptionButton active={chartType === 'Pie'} onClick={() => setChartType('Pie')}>
                  Pie
                </OptionButton>
              </AutoRow>
            </RowBetween>
            {chartType === 'Mcap' && <Chart {...{ formattedPeggedMcapAreaChart, totalMcapLabel, aspect }} />}
            {chartType === 'Area' && <Chart {...{ formattedPeggedChainAreaChart, chainList, aspect }} />}
            {chartType === 'Dominance' && (
              <PeggedChainResponsiveDominance
                stackOffset="expand"
                formatPercent={true}
                stackedDataset={stackedData}
                chainsUnique={chainList}
                chainColor={chainColor}
                daySum={daySum}
                aspect={aspect}
              />
            )}
            {chartType === 'Pie' && (
              <PeggedChainResponsivePie data={chainsCirculatingValues} chainColor={chainColor} aspect={aspect} />
            )}
          </Panel>
        </BreakpointPanels>
      </div>

      <AssetFilters>
        <h2>Filters</h2>
        <PeggedAssetGroupOptions label="Filters" />
      </AssetFilters>

      <StyledTable data={groupedChains} columns={columns} />
    </>
  )
}

export default PeggedChainsOverview
