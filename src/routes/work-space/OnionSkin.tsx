

interface Props {
    zIndex: number
    dataURL: string
}



export const OnionSkin = ({ zIndex, dataURL }: Props) => {
    return (
        <img
            className="ws-cs-canvas"
            style={{ zIndex, opacity: .3 }}
            src={dataURL}
        />
    )
}