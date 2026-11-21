
window.CONFIG = {

  titulo: "OUTLANDERS",
  subtitulo: "Ruleta de cacería",

  rows: 3,              
  avoidRepeat: true,    


  slots: [
    {
      id: "arma", label: "ARMA",
      symbols: [
        { name: "Gran Espada", img: "assets/armas/gran-espada.png" },
        { name: "Espada Larga", img: "assets/armas/espada-larga.png" },
        { name: "Espadas Dobles", img: "assets/armas/espadas-dobles.png" },
        { name: "Martillo", img: "assets/armas/martillo.png" },
        { name: "Lanza", img: "assets/armas/lanza.png" },
        { name: "Hacha Cargada", img: "assets/armas/hacha-cargada.png" },
        { name: "Ballesta Pesada", img: "assets/armas/ballesta-pesada.png" },
        { name: "Arco", img: "assets/armas/arco.png" },
      ],
    },
    {
      id: "elemento", label: "ELEMENTO",
      symbols: [
        { name: "Fuego", img: "assets/elementos/fuego.png" },
        { name: "Agua", img: "assets/elementos/agua.png" },
        { name: "Rayo", img: "assets/elementos/rayo.png" },
        { name: "Hielo", img: "assets/elementos/hielo.png" },
        { name: "Dragón", img: "assets/elementos/dragon.png" },
      ],
    },
    {
      id: "rol", label: "ROL",
      symbols: [
        { name: "Asalto", img: "assets/roles/asalto.png" },
        { name: "Disruptor", img: "assets/roles/disruptor.png" },
        { name: "Soporte", img: "assets/roles/soporte.png" },
      ],
    },
    {
      id: "monstruo", label: "MONSTRUO",
      optional: true,      
      enabled: true, 
      symbols: [
        { name: "Rathalos", img: "assets/monstruos/rathalos.png" },
        { name: "Rathian", img: "assets/monstruos/rathian.png" },
        { name: "Diablos", img: "assets/monstruos/diablos.png" },
        { name: "Odogaron", img: "assets/monstruos/odogaron.png" },
        { name: "Anjanath", img: "assets/monstruos/anjanath.png" },
        { name: "Barroth", img: "assets/monstruos/barroth.png"},
        { name: "Gran Girros", img: "assets/monstruos/gran-girros.png" },
        { name: "Gran Jagras", img: "assets/monstruos/gran-jagras.png" },
        { name: "Jyuratodus", img: "assets/monstruos/jyuratodus.png" },
        { name: "Kulu-Ya-Ku", img: "assets/monstruos/kuluyaku.png" },
        { name: "Kushala Daora", img: "assets/monstruos/kushala-daora.png" },
        { name: "Legiana", img: "assets/monstruos/legiana.png" },
        { name: "Paolumu", img: "assets/monstruos/paolumu.png" },
        { name: "Pukei-Pukei", img: "assets/monstruos/pukeipukei.png" },
        { name: "Radobaan", img: "assets/monstruos/radobaan.png" },
        { name: "Rathian Rosa", img: "assets/monstruos/rathian-rosa.png"},
        { name: "Ruger Aidal", img: "assets/monstruos/ruger-aidal.png" },
        { name: "Tobi-Kadachi", img: "assets/monstruos/tobi-kadachi.png" },
        { name: "Tzitzi-Ya-Ku", img: "assets/monstruos/tzitziyaku.png" },
        { name: "Rathalos Radiante", img: "assets/monstruos/rathalos-radiante.png" },
        { name: "Rathian Radiante", img: "assets/monstruos/rathian-radiante.png" },
        { name: "Diablos Radiante", img: "assets/monstruos/diablos-radiante.png" },
        { name: "Odogaron Radiante", img: "assets/monstruos/odogaron-radiante.png" },
        { name: "Anjanath Radiante", img: "assets/monstruos/anjanath-radiante.png" },
        { name: "Barroth Radiante", img: "assets/monstruos/barroth-radiante.png"},
        { name: "Gran Girros Radiante", img: "assets/monstruos/gran-girros-radiante.png" },
        { name: "Gran Jagras Radiante", img: "assets/monstruos/gran-jagras-radiante.png" },
        { name: "Jyuratodus Radiante", img: "assets/monstruos/jyuratodus-radiante.png" },
        { name: "Kulu-Ya-Ku Radiante", img: "assets/monstruos/kuluyaku-radiante.png" },
        { name: "Legiana Radiante", img: "assets/monstruos/legiana-radiante.png" },
        { name: "Paolumu Radiante", img: "assets/monstruos/paolumu-radiante.png" },
        { name: "Pukei-Pukei Radiante", img: "assets/monstruos/pukeipukei-radiante.png" },
        { name: "Radobaan Radiante", img: "assets/monstruos/radobaan-radiante.png" },
        { name: "Rathian Rosa Radiante", img: "assets/monstruos/rathian-rosa-radiante.png"},
        { name: "Tobi-Kadachi Radiante", img: "assets/monstruos/tobi-kadachi-radiante.png" },
        { name: "Tzitzi-Ya-Ku Radiante", img: "assets/monstruos/tzitziyaku-radiante.png" }
      ],
    },
  ],

  spinDuration: 1100,   
  reelStagger: 320,     
  turboFactor: 0.35,    


  sounds: { spin: null, stop: null, reveal: null },
};
