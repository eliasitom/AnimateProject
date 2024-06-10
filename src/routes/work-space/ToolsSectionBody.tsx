import { useContext } from "react"
import { DataContext } from "../../contexts/DataContext"
import "../../stylesheets/routes/work-space/ToolSectionBody.css"


export const ToolsSectionBody = () => {
  const contextValues = useContext(DataContext)
  if (!contextValues) throw new Error("useContext must be inside a DataProvider")
  const { tool, brushSize, setBrushSize, setMainColor } = contextValues

  const colors = [
    "#5F374B",
    "#8C6A5D",
    "#640D6B",
    "rgb(207, 126, 207)",
    "rgb(230, 191, 230)",
    "rgb(196, 61, 61)",
    "rgb(144, 46, 46)",
    "rgb(231, 119, 62)",
    "#F99417",
    "#FFC55A",
    "#10439F",
    "#5272F2",
    "#219C90",
    "#41B06E",
    "#59D5E0",
    "#8DECB4",
    "#F8F4EC",
    "#9a95a3",
    "#6d6678",
    "#534b5e",
    "#332941"
  ]

  return (
    <div className="ws-ts-body-container">
      <label className="ws-ts-brush-size-label">
        BRUSH SIZE {brushSize}
        <input
          className="ws-ts-brush-size-input"
          type="range"
          min={1}
          max={100}
          value={brushSize}
          onChange={e => setBrushSize(Number(e.target.value))}
        />
      </label>
      {
        tool !== "eraser" ? 
        <div className="ws-ts-brush-colors">
        {
          colors.map((elem, index) => (
            <div className="ws-ts-color-item" onClick={() => setMainColor(elem)} style={{ backgroundColor: elem }} key={index} />
          ))
        }
      </div> : undefined
      }
    </div>
  )
}