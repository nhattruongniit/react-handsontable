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
  manualRowResize: true
}
const numberDefaultCol = 3;

function App() {
  // State
  const [hotSetting, setHotSetting] = useState(defaultHotSetting);
  const [colParamsCollapse, setColParamsCollapse] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
  const [totalColumn, setTotalColumn] = useState([]);

  // Refs
  const tableRef = useRef();
  const hotRef = useRef();

  // init handsonetable
  useEffect(() => {
    fetchData();
    const columnsToCollapse = [];
    const newOptions = []
    const settings = params.reduce(({ colHeaders, columns}, param) => {
      columnsToCollapse.push(param.key)
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
            td.style.backgroundColor = '#fff';
            td.style.color = '#333';
            td.style.fontStyle = 'normal';
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
    const newTotalColumn = settings.columns.map(col => col.data);

    // set state
    setHotSetting(newHotSetting);
    setColParamsCollapse(columnsToCollapse);
    setOptions(newOptions);
    setSelectedParams(newOptions);
    setTotalColumn(newTotalColumn);

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
    const data = lists.reduce((dataSource, item, index) => {
      return [].concat(dataSource, {
        id: item.id,
        name: item.name,
        ...item.params.reduce((paramMap, param) => {
          return {
            ...paramMap,
            [param.key]: param.value
          }
        }, {})
      })
    },[])    

    hotRef.current.updateSettings({
      data
    })
  }

  function onChangeSelected(values) {
    const newValues = values.map(val => val.value);
    const hideColumns = colParamsCollapse.filter(val => !newValues.includes(val)).map(col => totalColumn.indexOf(col))

    hotRef.current.updateSettings({
      hiddenColumns: {
        columns: hideColumns,
        indicators: true
      }
    })
    hotRef.current.render();
    setSelectedParams(values);
  }

  return (
    <div className="container">
      <h2 className="text-center my-3">React Handsomtable</h2>
      <Select 
        isMulti
        name="params"
        value={selectedParams}
        options={options}
        onChange={onChangeSelected}
        className="select__menu"
      />
      <br/>
      <div id="handsontable" ref={tableRef} />
    </div>
  );
}

export default App;
