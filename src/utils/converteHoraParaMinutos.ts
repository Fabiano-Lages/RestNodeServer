export default function converteHoraParaMinutos(time: string) {
    const [hora, minutos] = time.split(':').map(Number);
    return(hora * 60 + minutos);
}