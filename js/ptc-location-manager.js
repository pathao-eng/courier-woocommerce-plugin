
window.LocationDataManager = {
    stores: null,
    cities: null,
    zones: {}, // Cache zones by cityId
    areas: {}, // Cache areas by zoneId

    CACHE_KEY: 'ptc_location_data',

    _storesPromise: null,
    _citiesPromise: null,
    _zonesPromises: {},
    _areasPromises: {},

    normalize(name) {
        return name ? name.trim().toLowerCase() : '';
    },
    async processBatch(items, batchSize, processFn) {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(item => processFn(item)));
            results.push(...batchResults);
        }
        return results;
    },

    loadFromStorage() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            if (!cached) return false;

            const data = JSON.parse(cached);

            this.cities = data.cities;
            this.stores = data.stores;
            this.zones = data.zones;
            this.areas = data.areas;
            return true;
        } catch (e) {
            console.error('Failed to load location data from storage', e);
            return false;
        }
    },

    saveToStorage() {
        try {
            const data = {
                timestamp: Date.now(),
                cities: this.cities,
                stores: this.stores,
                zones: this.zones,
                areas: this.areas
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save location data to storage', e);
        }
    },

    async fetchAllWithProgress(onProgress) {
        // 1. Fetch Cities
        onProgress(0, 100, 'Fetching cities...');
        await this.getCities();

        // 2. Fetch All Zones
        onProgress(20, 100, 'Fetching zones...');
        const zonesResponse = await new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, { action: 'get_zone_list_bulk' })
                .done(resolve)
                .fail(reject);
        });

        if (zonesResponse && zonesResponse.success) {
            const allZones = zonesResponse.data.data;
            // Group zones by city_id
            this.zones = allZones.reduce((acc, zone) => {
                if (!acc[zone.city_id]) acc[zone.city_id] = [];
                acc[zone.city_id].push({
                    id: zone.id,
                    name: zone.name
                });
                return acc;
            }, {});
        } else {
            console.error('Failed to fetch zones bulk', zonesResponse);
        }

        // 3. Fetch All Areas
        onProgress(60, 100, 'Fetching areas...');
        const areasResponse = await new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, { action: 'get_area_list_bulk' })
                .done(resolve)
                .fail(reject);
        });

        if (areasResponse && areasResponse.success) {
            const allAreas = areasResponse.data.data;
            // Group areas by zone_id
            this.areas = allAreas.reduce((acc, area) => {
                if (!acc[area.zone_id]) acc[area.zone_id] = [];
                acc[area.zone_id].push({
                    id: area.id,
                    name: area.name
                });
                return acc;
            }, {});
        } else {
            console.error('Failed to fetch areas bulk', areasResponse);
        }


        // 4. Fetch Stores
        onProgress(90, 100, 'Fetching stores...');
        await this.getStores();

        // 5. Save
        onProgress(95, 100, 'Saving to local storage...');
        this.saveToStorage();

        onProgress(100, 100, 'Complete!');
    },

    async fetchAll() {
        if (this.loadFromStorage()) {
            if (!this.stores) await this.getStores();
            return;
        }
        await this.fetchAllWithProgress(() => { });
    },

    getStores() {
        if (this.stores) return Promise.resolve(this.stores);
        if (this._storesPromise) return this._storesPromise;

        this._storesPromise = new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, { action: 'get_stores' })
                .done(response => {
                    this.stores = response?.data.map(store => ({
                        id: store.store_id,
                        name: store.store_name,
                        is_default_store: store.is_default_store,
                        is_active: store.is_active,
                        selected: store.is_default_store
                    }));
                    resolve(this.stores);
                })
                .fail(err => {
                    this._storesPromise = null;
                    reject(err);
                });
        });
        return this._storesPromise;
    },

    getCities() {
        if (this.cities) return Promise.resolve(this.cities);
        if (this._citiesPromise) return this._citiesPromise;

        this._citiesPromise = new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, { action: 'get_cities' })
                .done(response => {
                    this.cities = response?.data.map(city => ({
                        id: city?.city_id,
                        name: city?.city_name
                    }));
                    resolve(this.cities);
                })
                .fail(err => {
                    this._citiesPromise = null;
                    reject(err);
                });
        });
        return this._citiesPromise;
    },

    getZones(cityId) {
        if (!cityId) return Promise.resolve([]);
        if (this.zones[cityId]) return Promise.resolve(this.zones[cityId]);
        if (this._zonesPromises[cityId]) return this._zonesPromises[cityId];

        this._zonesPromises[cityId] = new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, {
                action: 'get_zones',
                city_id: cityId
            })
                .done(response => {
                    const zones = response?.data?.data?.data?.map(zone => ({
                        id: zone?.zone_id,
                        name: zone?.zone_name
                    })) || [];
                    this.zones[cityId] = zones;
                    resolve(zones);
                })
                .fail(err => {
                    delete this._zonesPromises[cityId];
                    reject(err);
                });
        });
        return this._zonesPromises[cityId];
    },

    getAreas(zoneId) {
        if (!zoneId) return Promise.resolve([]);
        if (this.areas[zoneId]) return Promise.resolve(this.areas[zoneId]);
        if (this._areasPromises[zoneId]) return this._areasPromises[zoneId];

        this._areasPromises[zoneId] = new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, {
                action: 'get_areas',
                zone_id: zoneId
            })
                .done(response => {
                    const areas = response?.data?.data?.data?.map(area => ({
                        id: area?.area_id,
                        name: area?.area_name
                    })) || [];
                    this.areas[zoneId] = areas;
                    resolve(areas);
                })
                .fail(err => {
                    delete this._areasPromises[zoneId];
                    reject(err);
                });
        });
        return this._areasPromises[zoneId];
    }
};
