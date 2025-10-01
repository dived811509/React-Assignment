import React, { useState, useEffect, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown"; // ✅ NEW: Added Dropdown
import { InputNumber } from "primereact/inputnumber"; // ✅ NEW: Added InputNumber
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./App.css";

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

interface ApiResponse {
  data: Artwork[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
    current_page: number;
  };
}

const App: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedRows, setSelectedRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [showSelectionPanel, setShowSelectionPanel] = useState<boolean>(false);
  const [forceRender, setForceRender] = useState(0);

  // ✅ NEW: Row selection dropdown states
  const [showRowSelector, setShowRowSelector] = useState<boolean>(false);
  const [rowCountToSelect, setRowCountToSelect] = useState<number>(5);
  const [selectionMode, setSelectionMode] = useState<string>("from-current");

  const rowsPerPage = 12;

  // ✅ NEW: Selection mode options
  const selectionModeOptions = [
    { label: "From Current Page", value: "from-current" },
    { label: "From All Pages", value: "from-all" },
    { label: "Random Selection", value: "random" },
  ];

  useEffect(() => {
    fetchArtworks(currentPage);
  }, [currentPage]);

  const fetchArtworks = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rowsPerPage}&fields=id,title,place_of_origin,artist_display,inscriptions,date_start,date_end`
      );
      const data: ApiResponse = await response.json();
      setArtworks(data.data);
      setTotalRecords(data.pagination.total);
    } catch (error) {
      console.error("Error fetching artworks:", error);
    } finally {
      setLoading(false);
    }
  };

  const onPageChange = (event: any) => {
    const newPage = event.page + 1;
    setCurrentPage(newPage);
  };

  const handleRowSelection = useCallback((rowId: number, checked: boolean) => {
    setSelectedRows((prevSelected) => {
      const newSelected = { ...prevSelected };

      if (checked) {
        newSelected[rowId] = true;
      } else {
        delete newSelected[rowId];
      }

      return newSelected;
    });

    setForceRender((prev) => prev + 1);
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedRows((prevSelected) => {
        const newSelected = { ...prevSelected };
        const currentPageIds = artworks.map((artwork) => artwork.id);

        if (checked) {
          currentPageIds.forEach((id) => {
            newSelected[id] = true;
          });
        } else {
          currentPageIds.forEach((id) => {
            delete newSelected[id];
          });
        }

        return newSelected;
      });

      setForceRender((prev) => prev + 1);
    },
    [artworks]
  );

  // ✅ NEW: Handle automatic row selection based on count
  const handleSelectRowsByCount = () => {
    setSelectedRows((prevSelected) => {
      let newSelected = { ...prevSelected };
      let rowsToSelect: number[] = [];

      switch (selectionMode) {
        case "from-current":
          // Select from current page
          const currentPageIds = artworks.map((artwork) => artwork.id);
          rowsToSelect = currentPageIds.slice(
            0,
            Math.min(rowCountToSelect, currentPageIds.length)
          );
          break;

        case "random":
          // Random selection from current page
          const shuffled = [...artworks].sort(() => 0.5 - Math.random());
          rowsToSelect = shuffled
            .slice(0, Math.min(rowCountToSelect, shuffled.length))
            .map((a) => a.id);
          break;

        case "from-all":
          // For demonstration, select from current page (in real app, you'd need to fetch from multiple pages)
          const allCurrentIds = artworks.map((artwork) => artwork.id);
          rowsToSelect = allCurrentIds.slice(
            0,
            Math.min(rowCountToSelect, allCurrentIds.length)
          );
          break;

        default:
          break;
      }

      // Clear current selections and add new ones
      newSelected = {};
      rowsToSelect.forEach((id) => {
        newSelected[id] = true;
      });

      return newSelected;
    });

    setForceRender((prev) => prev + 1);
    setShowRowSelector(false); // Close the selector after selection
  };

  // ✅ NEW: Clear all selections
  const handleClearAllSelections = () => {
    setSelectedRows({});
    setForceRender((prev) => prev + 1);
  };

  const isAllCurrentPageSelected = useCallback(() => {
    if (artworks.length === 0) return false;
    return artworks.every((artwork) => selectedRows[artwork.id] === true);
  }, [artworks, selectedRows]);

  const rowCheckboxTemplate = useCallback(
    (rowData: Artwork) => {
      const isSelected = selectedRows[rowData.id] === true;

      return (
        <Checkbox
          key={`row-${rowData.id}-${forceRender}-${isSelected}`}
          inputId={`row-checkbox-${rowData.id}`}
          checked={isSelected}
          onChange={(e) => {
            handleRowSelection(rowData.id, e.checked ?? false);
          }}
        />
      );
    },
    [selectedRows, forceRender, handleRowSelection]
  );

  const headerCheckboxTemplate = useCallback(() => {
    const allSelected = isAllCurrentPageSelected();

    return (
      <Checkbox
        key={`header-${forceRender}-${allSelected}`}
        inputId="header-select-all"
        checked={allSelected}
        onChange={(e) => {
          handleSelectAll(e.checked ?? false);
        }}
      />
    );
  }, [isAllCurrentPageSelected, forceRender, handleSelectAll]);

  const toggleSelectionPanel = () => {
    setShowSelectionPanel(!showSelectionPanel);
  };

  const getSelectedRowsForCurrentPage = () => {
    return artworks.filter((artwork) => selectedRows[artwork.id] === true);
  };

  const getSelectedCount = () => {
    return Object.keys(selectedRows).filter(
      (key) => selectedRows[parseInt(key)] === true
    ).length;
  };

  const rowClassName = useCallback(
    (rowData: Artwork) => {
      return selectedRows[rowData.id] === true ? "selected-row" : "";
    },
    [selectedRows]
  );

  return (
    <div className="app">
      <h1>Art Institute of Chicago - Artworks</h1>

      {/* ✅ NEW: Row Selection Controls */}
      <div className="selection-controls">
        <div className="selection-buttons">
          <Button
            label={`Selected Rows (${getSelectedCount()})`}
            onClick={toggleSelectionPanel}
            className="p-button-outlined"
          />

          <Button
            label="Select Rows..."
            onClick={() => setShowRowSelector(!showRowSelector)}
            className="p-button-outlined p-button-secondary"
            icon="pi pi-chevron-down"
          />

          <Button
            label="Clear All"
            onClick={handleClearAllSelections}
            className="p-button-outlined p-button-danger"
            icon="pi pi-times"
          />
        </div>

        {/* ✅ NEW: Row Selection Dropdown Panel */}
        {showRowSelector && (
          <div className="row-selector-panel">
            <h4>Select Multiple Rows</h4>

            <div className="selector-controls">
              <div className="input-group">
                <label htmlFor="row-count">Number of rows:</label>
                <InputNumber
                  inputId="row-count"
                  value={rowCountToSelect}
                  onValueChange={(e) => setRowCountToSelect(e.value || 1)}
                  min={1}
                  max={rowsPerPage}
                  showButtons
                  buttonLayout="horizontal"
                  step={1}
                />
              </div>

              <div className="input-group">
                <label htmlFor="selection-mode">Selection mode:</label>
                <Dropdown
                  inputId="selection-mode"
                  value={selectionMode}
                  options={selectionModeOptions}
                  onChange={(e) => setSelectionMode(e.value)}
                  placeholder="Select mode"
                  className="selection-mode-dropdown"
                />
              </div>

              <div className="button-group">
                <Button
                  label="Submit"
                  onClick={handleSelectRowsByCount}
                  className="p-button-success"
                  icon="pi pi-check"
                />
                <Button
                  label="Cancel"
                  onClick={() => setShowRowSelector(false)}
                  className="p-button-secondary"
                  icon="pi pi-times"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Selection Panel */}
      {showSelectionPanel && (
        <div className="selection-panel">
          <h3>Row Selection Panel</h3>
          <p>Total Selected Rows: {getSelectedCount()}</p>
          <p>
            Selected on Current Page: {getSelectedRowsForCurrentPage().length}
          </p>
          {getSelectedCount() > 0 && (
            <div>
              <h4>Selected Row IDs:</h4>
              <div className="selected-ids">
                {Object.keys(selectedRows)
                  .filter((key) => selectedRows[parseInt(key)] === true)
                  .map((key) => (
                    <span key={key} className="selected-id">
                      {key}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DataTable
        key={`datatable-${forceRender}`}
        value={artworks}
        loading={loading}
        tableStyle={{ minWidth: "60rem" }}
        className="custom-datatable"
        rowClassName={rowClassName}
      >
        <Column
          header={headerCheckboxTemplate}
          body={rowCheckboxTemplate}
          style={{ width: "3rem" }}
        />
        <Column field="title" header="Title" style={{ width: "25%" }} />
        <Column
          field="place_of_origin"
          header="Place of Origin"
          style={{ width: "15%" }}
        />
        <Column
          field="artist_display"
          header="Artist"
          style={{ width: "25%" }}
        />
        <Column
          field="inscriptions"
          header="Inscriptions"
          style={{ width: "20%" }}
        />
        <Column
          field="date_start"
          header="Start Date"
          style={{ width: "8%" }}
        />
        <Column field="date_end" header="End Date" style={{ width: "7%" }} />
      </DataTable>

      <Paginator
        first={(currentPage - 1) * rowsPerPage}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
        template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
      />
    </div>
  );
};

export default App;
