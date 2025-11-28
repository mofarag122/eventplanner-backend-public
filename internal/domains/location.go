package domains

type Country struct {
	ID   uint64 `json:"id"`
	Name string `json:"name"`
	ISO3 string `json:"iso3"`
	ISO2 string `json:"iso2"`
}

type City struct {
	ID        uint64 `json:"id"`
	CountryID uint64 `json:"countryId"`
	Name      string `json:"name"`
}

type EventLocation struct {
	ID              uint64  `json:"id"`
	CityID          uint64  `json:"cityId"`
	Region          *string `json:"region"`
	Street          string  `json:"street"`
	BuildingNumber  string  `json:"buildingNumber"`
	ApartmentNumber *string `json:"apartmentNumber"`
	PostalCode      *string `json:"postalCode"`
	Latitude        float64 `json:"latitude"`
	Longitude       float64 `json:"longitude"`
	Notes           *string `json:"notes"`
}
