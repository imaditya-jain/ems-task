import { createSlice } from '@reduxjs/toolkit'
import { downloadReportHandler } from '@/lib/features/report.feature'

interface ReportState {
  /** "<report>-<format>" of the download in progress, e.g. "salary-pdf"; null when idle */
  downloading: string | null
}

const initialState: ReportState = { downloading: null }

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(downloadReportHandler.pending, (state, action) => {
        state.downloading = `${action.meta.arg.report}-${action.meta.arg.format}`
      })
      .addCase(downloadReportHandler.fulfilled, (state) => {
        state.downloading = null
      })
      .addCase(downloadReportHandler.rejected, (state) => {
        state.downloading = null
      })
  },
})

export default reportSlice.reducer
