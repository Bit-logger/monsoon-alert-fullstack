const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// These will be loaded from GitHub Secrets
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const weatherApiKey = process.env.WEATHER_API_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Our "Virtual Sensor Network" - A list of critical locations in Hyderabad
const locations = [
  { name: "Hitech City", lat: 17.4486, lng: 78.3918 },
  { name: "Gachibowli", lat: 17.4410, lng: 78.3439 },
  { name: "Banjara Hills", lat: 17.4150, lng: 78.4412 },
  { name: "Secunderabad", lat: 17.4399, lng: 78.4983 },
  { name: "Charminar", lat: 17.3616, lng: 78.4747 },
  { name: "Kukatpally", lat: 17.4848, lng: 78.4118 },
  { name: "Begumpet", lat: 17.4428, lng: 78.4682 },
  { name: "Uppal", lat: 17.3984, lng: 78.5583 },
];

async function fetchAndSaveAllWeather() {
  console.log(`Starting weather fetch for ${locations.length} locations...`);

  const weatherDataPromises = locations.map(async (location) => {
    const url = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${location.lat},${location.lng}&aqi=no`;
    try {
      const response = await axios.get(url);
      const data = response.data;
      return {
        location_name: location.name,
        lat: location.lat,
        lng: location.lng,
        temp_c: data.current.temp_c,
        precip_mm: data.current.precip_mm,
        last_updated: data.current.last_updated,
      };
    } catch (error) {
      console.error(`Failed to fetch weather for ${location.name}:`, error.message);
      return null;
    }
  });

  const results = (await Promise.all(weatherDataPromises)).filter(Boolean); // Filter out any null results from failed fetches

  if (results.length > 0) {
    const { data, error } = await supabase
      .from('weather_reports')
      .upsert(results, { onConflict: 'location_name' }); // 'upsert' will update if location exists, or insert if it's new

    if (error) {
      console.error('Error saving data to Supabase:', error);
      process.exit(1);
    } else {
      console.log(`Successfully saved/updated ${results.length} weather reports to Supabase.`);
    }
  } else {
    console.log("No weather data to save.");
  }
}

fetchAndSaveAllWeather();