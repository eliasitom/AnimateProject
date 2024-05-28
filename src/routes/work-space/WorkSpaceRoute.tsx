import { useResolution } from "../../custom-hooks/useResolutions"
import "../../stylesheets/routes/work-space/WorkSpaceRoute.css"

import { FaPaintBrush, FaEraser } from "react-icons/fa";
import { IoArrowUndo, IoArrowRedo } from "react-icons/io5";
import { BiLayerPlus } from "react-icons/bi";
import { HiEye, HiEyeOff } from "react-icons/hi";


import { CustomCanvas } from "./CustomCanvas";
import { useContext } from "react";
import { DataContext, createLayer, createUndoObj, undoStackObject } from "../../contexts/DataContext";
import { ToolsSectionBody } from "./ToolsSectionBody";
import { TbDeviceIpadHorizontalPlus, TbDeviceTabletPlus } from "react-icons/tb";






export const WorkSpaceRoute = () => {
  const { windowWidth } = useResolution()

  const contextValues = useContext(DataContext)
  if (!contextValues) throw new Error("useContext must be inside a DataProvider")
  const {
    tool,
    brushSize,
    setTool,
    mainColor,
    mainUndoStack,
    setMainUndoStack,
    handleUndo,
    handleRedo,
    layers,
    setLayers,
    selectedLayer,
    setSelectedLayer,
    handleNewEmptyFrame,
    currentFrame,
    setCurrentFrame,
    keyframesLength
  } = contextValues

  const mediaQueriesStyles = {
    display: windowWidth <= 768 ? "none" : "flex"
  }





  // Generador de índices para el navegador del timeline
  const frameIndexGenerator = Array.from({ length: keyframesLength }, (_, index) => (
    <div
      className={`ws-tls-nav-frame ${index === currentFrame ? "current-frame" : ""}`}
      onClick={() => setCurrentFrame(index)}
      key={index}
    />
  ));

  const handleKeyframeClick = (index: number, layerName: string) => {
    setCurrentFrame(index)
    setSelectedLayer(layerName)
  }



  const handleNewLayer = () => {
    // Crear un undoObj
    const newUndoObject: undoStackObject =
      createUndoObj(selectedLayer, currentFrame, layers, "newLayer")

    // Agregar el objeto a la linea principal de acciones (mainUndoStack)
    setMainUndoStack((prev: undoStackObject[]) => {
      return [...prev, newUndoObject]
    })

    // Crear la nueva capa y agregarla a layers[]
    const newLayerName = `Layer_` + (layers.length).toString()
    const newLayer = createLayer(newLayerName, layers.length - 1)
    setLayers(prev => [...prev, newLayer])

    // Seleccionar la nueva capa
    setSelectedLayer(newLayerName)
  }

  const handleLayerVisibility = (layerName: string) => {
    setLayers(prev => {
      let newLayers = [...prev]

      newLayers = newLayers.map(currentLayer => {
        if (currentLayer.layerName === layerName) {
          currentLayer.layerSettings.hidden = !currentLayer.layerSettings.hidden
        }
        return currentLayer
      })
      return newLayers
    })
  }
  const handleLayerOpacity = (e: React.ChangeEvent<HTMLInputElement>, layerName: string) => {
    e.preventDefault()

    setLayers(prev => {
      let newLayers = [...prev]

      newLayers = newLayers.map(elem => {
        if(elem.layerName === layerName) elem.layerSettings.opacity = Number(e.target.value)
        return elem
      })
      return newLayers
    })
  }




  const undoStackDisplay = () => {
    return (
      <div style={{ marginLeft: 10, overflow: "hidden", overflowY: "scroll", height: "100%" }}>
        <h3>Undo Stack Display</h3>
        {
          mainUndoStack.map((elem, index) =>
            elem.undoType ?
              <div key={index} style={{ marginBottom: 15 }}>
                <p>ID: {elem.undoId}</p>
                <p>Type: {elem.undoType}</p>
                <div>
                  {
                    elem.layers.map((currentLayer, index) => (
                      <div key={index}>
                        <p>{currentLayer.layerName}</p>
                        <div>
                          {
                            currentLayer.keyframes.map((currentKeyframe, index) => (
                              <img
                                style={{
                                  width: 50,
                                  height: 50,
                                  border: "solid black 1px",
                                  marginRight: 5
                                }}
                                key={index}
                                src={currentKeyframe.dataURL}
                              />
                            ))
                          }
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
              : undefined
          )
        }
      </div>
    )
  }


  return (
    <div className="ws-main">
      <div className="ws-file-section panel" style={mediaQueriesStyles}>
        <header className="ws-fs-header">
          <p>File</p>
        </header>
        <div className="ws-fs-body" style={{ height: "500px" }}>
          {
            undoStackDisplay()
          }
        </div>
      </div>
      <div className="ws-canvas-section panel">
        {
          layers.map((currentLayer, index) => (
            !currentLayer.layerSettings.hidden ?
              <CustomCanvas key={index} layerData={currentLayer} />
              : undefined
          ))
        }
        <canvas width={400} height={400} className="ws-cs-base" />
      </div>
      <div className="ws-tools-section panel" style={mediaQueriesStyles}>
        <aside className="ws-ts-aside">
          <div className="ws-ts-aside-tools">
            <FaPaintBrush
              className={`${tool === "brush" ? "selected-tool" : ""}`}
              onClick={() => setTool("brush")}
            />
            <FaEraser
              className={`${tool === "eraser" ? "selected-tool" : ""}`}
              onClick={() => setTool("eraser")}
            />
            <IoArrowUndo onClick={handleUndo} />
            <IoArrowRedo onClick={handleRedo} />
          </div>
          <div className="ws-ts-aside-info">
            <div className="ws-ts-aside-info-brush-size">
              <div style={{ width: brushSize / 2 }} />
            </div>
            <div className="ws-ts-aside-info-main-color" style={{ backgroundColor: mainColor }} />
          </div>
        </aside>
        <div className="ws-ts-body">
          <ToolsSectionBody />
        </div>
      </div>
      <div className="ws-layers-section panel" style={mediaQueriesStyles}>
        <header className="ws-ls-header">
          <p>Layers</p>
          <BiLayerPlus onClick={handleNewLayer} />
        </header>
        <aside className="ws-ls-aside">

        </aside>
        <div className="ws-ls-body">
          {
            [...layers].reverse().map((elem, index) => (
              <div
                className={`layer ${selectedLayer === elem.layerName ? "selected-layer" : ""}`}
                key={index}
                onClick={() => setSelectedLayer(elem.layerName)}
              >
                <p>{elem.layerName}</p>
                <div className="layer-options">
                  <input
                    className="input1 layer-opacity-input"
                    type="number"
                    step={0.01}
                    value={elem.layerSettings.opacity}
                    onChange={e => handleLayerOpacity(e, elem.layerName)}
                    min={0}
                    max={1}
                  />
                  {
                    elem.layerSettings.hidden ?
                      <HiEyeOff onClick={() => handleLayerVisibility(elem.layerName)} />
                      : <HiEye onClick={() => handleLayerVisibility(elem.layerName)} />
                  }
                </div>
              </div>
            ))
          }
        </div>
      </div>
      <div className="ws-timeline-section panel">
        <header className="ws-tls-header">
          <p>Timeline</p>
          <div className="ws-tls-header-options">
            <TbDeviceTabletPlus onClick={handleNewEmptyFrame} />
            <TbDeviceIpadHorizontalPlus />
          </div>
        </header>
        <aside className="ws-tls-nav">
          {
            frameIndexGenerator
          }
        </aside>
        <div className="ws-tls-body">
          {
            [...layers].reverse().map((currentLayer) => (
              <div
                className={`keyframes-container ${selectedLayer === currentLayer.layerName ? "selected-layer" : ""}`}
                key={currentLayer.layerName}
              >
                {
                  currentLayer.keyframes.map((currentKeyframe, index) => (
                    <div
                      className="keyframe"
                      key={index}
                      onClick={() => handleKeyframeClick(index, currentLayer.layerName)}
                    >
                      <div className={`keyframe-state ${currentKeyframe.state === "filled" ? "keyframe-state-filled" : ""}`} />
                      {
                        currentKeyframe.state === "filled" ? "f" : "e"
                      }
                    </div>
                  ))
                }
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}