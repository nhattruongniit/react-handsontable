import { useRef, useEffect, useState } from 'react';

// libs
import Handsontable from 'handsontable';
import Select from 'react-select'

// mock data
import { params, users } from './data';

function httpRequest(value) {
  return new Promise(resvole => {
    setTimeout(() => resvole(value), 1000)
  })
}
const numFixedCol = 3;

function App() {
  // default value
  const defaultHotSetting = {
    columns: [
      {
        data: "",
        type: "checkbox",
      },
      {
        data: "id",
        type: "text",
        readOnly: true,
        renderer: 'renderIdColumn'
      },
      {
        data: "name",
        type: "text",
        readOnly: true,
      },
    ],
    // colHeaders: ["", "Id", "Name"],
    // colHeaders: function(index) {
    //   console.log('colParamsCollapse: ' ,colParamsCollapse)
    //   return index + ': AB';
    // },
    rowHeaders: true,
    className: "htLeft",
    licenseKey: "non-commercial-and-evaluation",
    width: '100%',
    manualColumnResize: true,
    manualRowResize: true,
    afterChange: handleAfterChange
  }
  // State
  const [hotSetting, setHotSetting] = useState(defaultHotSetting);
  const [options, setOptions] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
  const [isUnsavedRows, setIsUnsavedRows] = useState(false);
  const [rowsSelected, setRowsSelected] = useState({});
  // Refs
  const tableRef = useRef();
  const hotRef = useRef();
  const defaultCellsRef = useRef({});
  const defaultDataRef = useRef([])
  const colParamsCollapse = useRef([]);
  const totalColumnRef = useRef([]);
  const rowsHaveItemChangedRef = useRef({})
  const rowsResetedRef = useRef({})
  const itemRowsChangesRef = useRef({})

  // init handsonetable
  useEffect(() => {
    fetchData();
    const newOptions = []
    const settings = params.reduce(({ colHeaders, columns}, param) => {
      colParamsCollapse.current.push(param.key)
      newOptions.push({
        label: param.key,
        value: param.key,
      })
      return {
        // colHeaders: [
        //   ...colHeaders,
        //   param.key
        // ],
        colHeaders: function(index) {
          let title = '';
          if(index >= 3) {
            title = `<button type="button" id="btnFilter" data-colIndex=${index}>${params[index - 3].key}</button>`
          }
          switch(index) {
            case 0: 
              title = '';
              break
            case 1: 
              title = 'Id';
              break
            case 2: 
              title = '<b>Name</b>';
              break
            default:
              break
          }
          return title
        },
        columns: [...columns, {
          data: param.key,
          type: 'text',
          readOnly: param.key === 'country',
          renderer: param.key === 'country' ? 'renderFlagColumn' : (instance, td, row, col, prop, value, cellProperties) => {
            Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);
            if(rowsResetedRef.current[row] || itemRowsChangesRef.current[`${row}-changed-${col}`]) {
              td.className = rowsResetedRef.current[row] ? 'direct-changed' : 'changed'
            }
            td.style.backgroundColor = defaultCellsRef.current[`${row}-default-${col}`] ? '#eee' : '#fff';
            td.style.color = defaultCellsRef.current[`${row}-default-${col}`] ? '#999' : '#333';
            td.style.fontStyle = defaultCellsRef.current[`${row}-default-${col}`] ? 'italic' : 'normal';
            td.innerText = value
          }
        }]
      }
    }, { colHeaders: hotSetting.colHeaders, columns: hotSetting.columns})
    Handsontable.renderers.registerRenderer('renderIdColumn', (instance, td, row, col, prop, value, cellProperties) => {
      Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);
      td.innerHTML = `<a href="#">${value || ''}</a>`
    })
    Handsontable.renderers.registerRenderer('renderFlagColumn', (instance, td, row, col, prop, value, cellProperties) => {
      Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);
      td.innerHTML = `<div class='flag ${value}' />`
    })
    const newHotSetting = {...hotSetting, ...settings};

    // set state
    setHotSetting(newHotSetting);
    setOptions(newOptions);
    setSelectedParams(newOptions);
    totalColumnRef.current = settings.columns.map(col => col.data);

    // handson add event
    Handsontable.dom.addEvent(tableRef.current, 'mousedown', (event) => {
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (event.target.nodeName === 'BUTTON' && event.target.id === 'btnFilter') {
        const colIndex = event.target.dataset.colindex
        console.log('BUTTON: ', colIndex)
      }
    });

    // new handsontable
    hotRef.current = new Handsontable(tableRef.current, {
      ...newHotSetting
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData() {
    const res = await httpRequest(users);
    mapDataToHT(res);
  }

  function mapDataToHT(lists) {
    const newDefaultCells = {};
    const data = lists.reduce((dataSource, item, rowIndex) => {
      return [].concat(dataSource, {
        id: item.id,
        name: item.name,
        ...item.params.reduce((paramMap, param, colIndex) => {
          if(param.isDefault === 'true') {
            newDefaultCells[`${rowIndex}-default-${colIndex + numFixedCol}`] = true
          }
          return {
            ...paramMap,
            [param.key]: param.value
          }
        }, {})
      })
    },[])
    defaultCellsRef.current = Object.assign({}, newDefaultCells);
    defaultDataRef.current = [].concat(JSON.parse(JSON.stringify(data)));
    hotRef.current.updateSettings({
      data
    });
    hotRef.current.render();
  }

  function onChangeSelected(values) {
    const newValues = values.map(val => val.value);
    const hideColumns = colParamsCollapse.current.filter(val => !newValues.includes(val)).map(col => totalColumnRef.current.indexOf(col))
    hotRef.current.updateSettings({
      hiddenColumns: {
        columns: hideColumns,
        indicators: true
      }
    })
    hotRef.current.render();
    setSelectedParams(values);
  }

  function handleAfterChange(changes, source) {
    if(!changes) return;
    setIsUnsavedRows(true);

    const columnIndex = totalColumnRef.current.indexOf(changes[0][1]);
    if(columnIndex >= numFixedCol) {
      console.log('changes: ', changes, totalColumnRef)

      rowsHaveItemChangedRef.current[changes[0][0]] = true;
      itemRowsChangesRef.current[`${changes[0][0]}-changed-${columnIndex}`] = true;
      hotRef.current.setCellMeta(changes[0][0], columnIndex, 'className', 'changed');
    }
    if(columnIndex === 0) {
      setRowsSelected(prevState => {
        return {...prevState, [changes[0][0]]: changes[0][3] }
      })
    }
    hotRef.current.render();
  }

  function toggleUnsavedRows(event) {
    const hiddenRows = [];
    const { checked } = event.target;

    if(!checked) {
      hotRef.current.updateSettings({
        hiddenRows: {
          rows: hiddenRows,
          indicators: true
        }
      });
      return;
    }

    const rows = hotRef.current.countRows();
    let i = 0;
    while (i < rows) {
      if(Object.keys(rowsHaveItemChangedRef.current).length > 0 || Object.keys(rowsResetedRef.current).length > 0 ) {
        if(!rowsHaveItemChangedRef.current[i] && !rowsResetedRef.current[i]) {
          hiddenRows.push(i);
        }
        i++;
      }
    }
    hotRef.current.updateSettings({
      hiddenRows: {
        rows: hiddenRows,
        indicators: true
      }
    })
  }

  function handleResetDefaultValue() {
    const newValue = [];
    const tableData = hotRef.current.getData();
    const listsIndexChange = Object.keys(rowsSelected).filter(row => rowsSelected[row]);
    const newRowsReseted = {
      ...rowsResetedRef.current,
      ...listsIndexChange.reduce((acc, item) => {
        return {
          ...acc,
          [item]: rowsSelected[item]
        }
      }, {})
    }
    listsIndexChange.forEach(item => {
      const parseItem = parseFloat(item);
      colParamsCollapse.current.forEach((colName, colIndex) => {
        if(defaultDataRef.current[parseItem][colName] !== tableData[parseItem][colIndex + numFixedCol]) {
          newValue.push([parseItem, colName, defaultDataRef.current[parseItem][colName]])
        }
      })
    });
    if(newValue.length > 0) {
      hotRef.current.setDataAtRowProp(newValue)
      hotRef.current.render();
    }
    hotRef.current.updateSettings({
      cells: (row, col) => {
        const cellProperties = {};
        if(rowsSelected[row] && col >= numFixedCol) {
          cellProperties.className = 'reset-changed'
        }
        return cellProperties
      }
    })
    rowsResetedRef.current = newRowsReseted
  }

  return (
    <div className="container">
      <h2 className="text-center my-3">React Handsomtable</h2>
      <div className="areaSelect">
        <div>Show/Hide Columns:</div>
        <div className="areaSelect_right">
          <Select 
            isMulti
            name="params"
            value={selectedParams}
            options={options}
            onChange={onChangeSelected}
            className="select__menu"
          />
        </div>
      </div>
      <div className="areaAction">
        {Object.keys(rowsSelected).length > 0 && (
          <p className="px-3 d-inline-block">
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              onClick={handleResetDefaultValue}
            >
                Reset Default Value
            </button>
          </p>
        )}
        {isUnsavedRows && (
          <>
            <input id="unsaved" type="checkbox" onChange={toggleUnsavedRows}/> <label htmlFor="unsaved">Unsaved Rows</label>
          </>
        )}
      </div>
      <br/>
      <div id="handsontable" ref={tableRef} />
    </div>
  );
}

export default App;
