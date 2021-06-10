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
    colHeaders: ["", "Id", "Name"],
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
  // Refs
  const tableRef = useRef();
  const hotRef = useRef();
  const defaultCellsRef = useRef({});
  const colParamsCollapse = useRef([]);
  const totalColumnRef = useRef([]);
  const rowsHaveItemChanged = useRef({})

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
        colHeaders: [
          ...colHeaders,
          param.key
        ],
        columns: [...columns, {
          data: param.key,
          type: 'text',
          readOnly: param.key === 'country',
          renderer: param.key === 'country' ? 'renderFlagColumn' : (instance, td, row, col, prop, value, cellProperties) => {
            Handsontable.renderers.TextRenderer.apply(this, [instance, td, row, col, prop, value, cellProperties]);
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
    if(source !== 'edit')  return;
    setIsUnsavedRows(true);
    const columnIndex = totalColumnRef.current.indexOf(changes[0][1]);
    if(columnIndex >= numFixedCol) {
      rowsHaveItemChanged.current[changes[0][0]] = true;
      hotRef.current.setCellMeta(changes[0][0], columnIndex, 'className', 'changed');
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
      if(Object.keys(rowsHaveItemChanged.current).length > 0 && !rowsHaveItemChanged.current[i]) {
        hiddenRows.push(i);
      }
      i++;
    }
    hotRef.current.updateSettings({
      hiddenRows: {
        rows: hiddenRows,
        indicators: true
      }
    })
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
      <div className="areaUnsaved">
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
