const apiKey = "8d18cc3ec326ca4282a7ab5a651c7f7b";

fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}`)
  .then(res => res.json())
  .then(data => {
    data.results.forEach(show => {
      movieDatabase.push({
        id: show.id,
        title: show.name,
        overview: show.overview,
        release_date: show.first_air_date,
        vote_average: show.vote_average,
        poster_path: "https://image.tmdb.org/t/p/original" + show.poster_path,
        media_type: "tv"
      });
    });
  });
