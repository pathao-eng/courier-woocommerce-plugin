
window.LocationDataManager = {
    stores: null,
    cities: null,
    zones: {}, // Cache zones by cityId
    areas: {}, // Cache areas by zoneId
    userInfo: null, // Cached user/merchant info from /aladdin/api/v1/user

    CACHE_KEY: 'ptc_location_data',
    STORES_CACHE_KEY: 'ptc_stores',
    USER_CACHE_KEY: 'ptc_user',

    _storesPromise: null,
    _citiesPromise: null,
    _zonesPromises: {},
    _areasPromises: {},
    _userInfoPromise: null,

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
            this.zones = data.zones || {};
            this.areas = data.areas || {};
            // Backward compat: old cache may have stores; overwrite with dedicated key if present
            this.stores = data.stores || null;

            const storesCached = localStorage.getItem(this.STORES_CACHE_KEY);
            if (storesCached) {
                try {
                    this.stores = JSON.parse(storesCached);
                } catch (e) {}
            }
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
                zones: this.zones,
                areas: this.areas
            };
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save location data to storage', e);
        }
        this.saveStoresToStorage();
    },

    saveStoresToStorage() {
        try {
            if (this.stores != null) {
                localStorage.setItem(this.STORES_CACHE_KEY, JSON.stringify(this.stores));
            }
        } catch (e) {
            console.error('Failed to save stores to storage', e);
        }
    },

    /**
     * Load user/merchant info from localStorage into this.userInfo.
     * @returns {boolean} true if valid data was loaded
     */
    loadUserFromStorage() {
        try {
            const cached = localStorage.getItem(this.USER_CACHE_KEY);
            if (!cached) return false;
            const data = JSON.parse(cached);
            if (!data || !data.data) return false;
            this.userInfo = data;
            return true;
        } catch (e) {
            console.error('Failed to load user info from storage', e);
            return false;
        }
    },

    /**
     * Save user/merchant API response to localStorage.
     * @param {Object} apiResponse - Full response from get_ptc_user (has .data with user object)
     */
    saveUserToStorage(apiResponse) {
        try {
            if (apiResponse && apiResponse.data) {
                localStorage.setItem(this.USER_CACHE_KEY, JSON.stringify(apiResponse));
            }
        } catch (e) {
            console.error('Failed to save user info to storage', e);
        }
    },

    /**
     * Get user/merchant info from /aladdin/api/v1/user. Uses in-memory cache, then localStorage, then fetches.
     * @param {boolean} [forceRefresh=false] - If true, skip cache and fetch from API
     * @returns {Promise<Object>} Resolves with full API response { message, type, code, data: { user_id, user_name, merchant_name, ... } }
     */
    getUserInfo(forceRefresh = false) {
        if (forceRefresh) {
            this._userInfoPromise = null;
        }
        if (!forceRefresh && this.userInfo) {
            return Promise.resolve(this.userInfo);
        }
        if (!forceRefresh && this.loadUserFromStorage()) {
            return Promise.resolve(this.userInfo);
        }
        if (this._userInfoPromise) {
            return this._userInfoPromise;
        }

        this._userInfoPromise = new Promise((resolve, reject) => {
            jQuery.post(ajaxurl, { action: 'get_ptc_user' })
                .done(response => {
                    if (response && response.success && response.data) {
                        this.userInfo = response.data;
                        this.saveUserToStorage(response.data);
                        resolve(response.data);
                    } else {
                        if (this.loadUserFromStorage()) {
                            resolve(this.userInfo);
                        } else {
                            reject(new Error('Could not fetch user info'));
                        }
                    }
                })
                .fail(err => {
                    this._userInfoPromise = null;
                    if (this.loadUserFromStorage()) {
                        resolve(this.userInfo);
                    } else {
                        reject(err);
                    }
                });
        });

        return this._userInfoPromise;
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
        try {
            const storesCached = localStorage.getItem(this.STORES_CACHE_KEY);
            if (storesCached) {
                this.stores = JSON.parse(storesCached);
                return Promise.resolve(this.stores);
            }
        } catch (e) {}
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
                    this.saveStoresToStorage();
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
